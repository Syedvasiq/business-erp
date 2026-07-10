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
  const { id } = await params;
  const body = await req.json();

  // Status-only update (from PurchaseStatusButton)
  if (body.status && !body.lines) {
    const po = await prisma.purchaseOrder.update({ where: { id }, data: { status: body.status } });
    return NextResponse.json(po);
  }

  // Full edit — reverse old journal, recalculate, repost
  const { vatRate: vatRatePct } = await getSettings();
  const VAT_RATE = vatRatePct / 100;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });

    // Reverse old stock changes
    for (const line of existing.lines) {
      const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
      const newQty = Math.max(0, Number(item.stockQty) - Number(line.qty));
      await tx.item.update({ where: { id: line.itemId }, data: { stockQty: newQty } });
    }

    // Delete old journal lines for this PO
    const oldJournal = await tx.journal.findFirst({ where: { reference: existing.number } });
    if (oldJournal) {
      await tx.journalLine.deleteMany({ where: { journalId: oldJournal.id } });
      await tx.journal.delete({ where: { id: oldJournal.id } });
    }

    // Delete old lines
    await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

    const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: body.supplierId } });
    const isRcm = supplier.vendorType === "INTERNATIONAL" || supplier.vendorType === "FREE_ZONE";

    let subtotal = 0;
    let inputVat = 0;
    const lineData = [];

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

    const landingCostPerUnit =
      body.lines.length > 0
        ? (Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0)) /
          body.lines.reduce((s: number, l: any) => s + Number(l.qty), 0)
        : 0;

    const totalAed =
      (subtotal + inputVat + Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0)) *
      Number(body.exchangeRate ?? 1);

    const po = await tx.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: body.supplierId,
        orderDate: new Date(body.orderDate),
        currency: body.currency ?? "AED",
        exchangeRate: body.exchangeRate ?? 1,
        subtotalAed: subtotal,
        inputVat,
        customsDuty: body.customsDuty ?? 0,
        shippingCost: body.shippingCost ?? 0,
        totalAed,
        isRcm,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    // Reapply stock
    for (const line of po.lines) {
      const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
      const newQty = Number(item.stockQty) + Number(line.qty);
      const newAvgCost =
        newQty > 0
          ? (Number(item.weightedAvgCost) * Number(item.stockQty) +
              (Number(line.unitCost) + landingCostPerUnit) * Number(line.qty)) /
            newQty
          : Number(line.unitCost);
      await tx.item.update({ where: { id: line.itemId }, data: { stockQty: newQty, weightedAvgCost: newAvgCost } });
    }

    // Repost journal
    const journalLines: any[] = [
      { accountCode: "1300", type: "DEBIT", amount: subtotal },
      { accountCode: "2000", type: "CREDIT", amount: totalAed },
    ];
    if (inputVat > 0) journalLines.push({ accountCode: "1200", type: "DEBIT", amount: inputVat });
    if (isRcm) {
      const rcmVat = subtotal * VAT_RATE;
      journalLines.push({ accountCode: "1200", type: "DEBIT", amount: rcmVat });
      journalLines.push({ accountCode: "2200", type: "CREDIT", amount: rcmVat });
    }
    if (Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0) > 0) {
      journalLines.push({
        accountCode: "5200",
        type: "DEBIT",
        amount: Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0),
      });
    }

    await postJournal(po.number, `Purchase from ${supplier.name}`, new Date(body.orderDate), journalLines);

    return po;
  });

  return NextResponse.json(result);
}
