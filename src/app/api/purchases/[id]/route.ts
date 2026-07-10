import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";
import { getSettings } from "@/lib/settings";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, lines: { include: { item: true } } },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Status-only update
    if (body.status && !body.lines && !body.payment) {
      const po = await prisma.purchaseOrder.update({ where: { id }, data: { status: body.status } });
      return NextResponse.json(po);
    }

    // Payment recording
    if (body.payment && !body.lines) {
      const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
      await prisma.payment.create({
        data: {
          purchaseOrderId: id,
          method:        body.payment.method,
          amount:        body.payment.amount,
          date:          new Date(body.payment.date),
          bankName:      body.payment.bankName      ?? null,
          transactionId: body.payment.transactionId ?? null,
          chequeNumber:  body.payment.chequeNumber  ?? null,
          chequeDate:    body.payment.chequeDate ? new Date(body.payment.chequeDate) : null,
          chequeBank:    body.payment.chequeBank    ?? null,
          notes:         body.payment.notes         ?? null,
        },
      });
      await postJournal(
        `PAY-PO-${po.number}-${Date.now()}`,
        `Payment for PO ${po.number}`,
        new Date(body.payment.date),
        [
          { accountCode: "2000", type: "DEBIT",  amount: body.payment.amount },
          { accountCode: "1000", type: "CREDIT", amount: body.payment.amount },
        ]
      );
      const updated = await prisma.purchaseOrder.update({ where: { id }, data: { status: "PAID" } });
      return NextResponse.json(updated);
    }

    // Full edit — no transaction, sequential queries to avoid Neon 5s timeout
    if (!body.orderDate) {
      return NextResponse.json({ error: "orderDate is required" }, { status: 400 });
    }

    const { vatRate: vatRatePct } = await getSettings();
    const VAT_RATE = vatRatePct / 100;

    // 1. Load existing PO + lines
    const existing = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });

    // 2. Reverse old stock
    for (const line of existing.lines) {
      await prisma.item.updateMany({
        where: { id: line.itemId },
        data: { stockQty: { decrement: Number(line.qty) } },
      });
    }

    // 3. Delete old journal
    const oldJournal = await prisma.journal.findFirst({
      where: { reference: { startsWith: existing.number } },
    });
    if (oldJournal) {
      await prisma.journalLine.deleteMany({ where: { journalId: oldJournal.id } });
      await prisma.journal.delete({ where: { id: oldJournal.id } });
    }

    // 4. Delete old lines
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

    // 5. Recalculate
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: body.supplierId } });
    const isRcm = supplier.vendorType === "INTERNATIONAL" || supplier.vendorType === "FREE_ZONE";

    let subtotal = 0;
    let inputVat = 0;
    const lineData: any[] = [];

    for (const line of body.lines) {
      const lineSubtotal = Number(line.qty) * Number(line.unitCost);
      const vat = isRcm ? 0 : lineSubtotal * VAT_RATE;
      subtotal += lineSubtotal;
      inputVat += vat;
      lineData.push({
        itemId: line.itemId,
        qty: line.qty,
        unitCost: line.unitCost,
        vatAmount: vat,
        lineTotal: lineSubtotal + vat,
      });
    }

    const totalQty = body.lines.reduce((s: number, l: any) => s + Number(l.qty), 0);
    const landingCostPerUnit = totalQty > 0
      ? (Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0)) / totalQty
      : 0;

    const totalAed =
      (subtotal + inputVat + Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0)) *
      Number(body.exchangeRate ?? 1);

    // 6. Update PO + create new lines
    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId:   body.supplierId,
        orderDate:    new Date(body.orderDate),
        currency:     body.currency ?? "AED",
        exchangeRate: body.exchangeRate ?? 1,
        subtotalAed:  subtotal,
        inputVat,
        customsDuty:  body.customsDuty ?? 0,
        shippingCost: body.shippingCost ?? 0,
        totalAed,
        isRcm,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    // 7. Reapply stock
    for (const line of po.lines) {
      const item = await prisma.item.findUniqueOrThrow({ where: { id: line.itemId } });
      const newQty = Number(item.stockQty) + Number(line.qty);
      const newAvgCost = newQty > 0
        ? (Number(item.weightedAvgCost) * Number(item.stockQty) +
            (Number(line.unitCost) + landingCostPerUnit) * Number(line.qty)) / newQty
        : Number(line.unitCost);
      await prisma.item.update({
        where: { id: line.itemId },
        data: { stockQty: newQty, weightedAvgCost: newAvgCost },
      });
    }

    // 8. Post journal
    const journalLines: any[] = [
      { accountCode: "1300", type: "DEBIT",  amount: subtotal },
      { accountCode: "2000", type: "CREDIT", amount: totalAed },
    ];
    if (inputVat > 0) journalLines.push({ accountCode: "1200", type: "DEBIT", amount: inputVat });
    if (isRcm) {
      const rcmVat = subtotal * VAT_RATE;
      journalLines.push({ accountCode: "1200", type: "DEBIT",  amount: rcmVat });
      journalLines.push({ accountCode: "2200", type: "CREDIT", amount: rcmVat });
    }
    if (Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0) > 0) {
      journalLines.push({
        accountCode: "5200",
        type: "DEBIT",
        amount: Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0),
      });
    }

    await postJournal(
      `${po.number}-R${Date.now()}`,
      `Purchase from ${supplier.name} (edited)`,
      new Date(body.orderDate),
      journalLines
    );

    return NextResponse.json(po);
  } catch (e: any) {
    console.error("PUT /api/purchases/[id] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
