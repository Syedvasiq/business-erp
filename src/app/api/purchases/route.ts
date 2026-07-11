import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";
import { generateDocNumber, validate } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    include: { supplier: true, lines: { include: { item: true } } },
    orderBy: { orderDate: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    validate([
      [!!body.supplierId, "Please select a supplier."],
      [Array.isArray(body.lines) && body.lines.length > 0, "Add at least one line item."],
      ...((body.lines ?? []) as any[]).map((l: any, i: number) => [
        !!l.itemId, `Line ${i + 1}: please select an item.`
      ] as [boolean, string]),
      ...((body.lines ?? []) as any[]).map((l: any, i: number) => [
        Number(l.qty) > 0, `Line ${i + 1}: qty must be greater than 0.`
      ] as [boolean, string]),
      ...((body.lines ?? []) as any[]).map((l: any, i: number) => [
        Number(l.unitCost) > 0, `Line ${i + 1}: unit cost must be greater than 0.`
      ] as [boolean, string]),
      [Number(body.exchangeRate ?? 1) > 0, "Exchange rate must be greater than 0."],
    ]);

    const { vatRate: vatRatePct } = await getSettings();
    const VAT_RATE = vatRatePct / 100;

    const count = await prisma.purchaseOrder.count();
    const number = generateDocNumber("PO", count + 1);

    // Idempotency guard
    const existing = await prisma.purchaseOrder.findUnique({ where: { number } });
    if (existing) return NextResponse.json(existing, { status: 201 });

    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: body.supplierId } });
    const isRcm = supplier.vendorType === "INTERNATIONAL" || supplier.vendorType === "FREE_ZONE";

    let subtotal = 0, inputVat = 0;
    const lineData: any[] = [];

    for (const line of body.lines) {
      const lineSubtotal = Number(line.qty) * Number(line.unitCost);
      const vat = isRcm ? 0 : lineSubtotal * VAT_RATE;
      subtotal += lineSubtotal;
      inputVat += vat;
      lineData.push({ itemId: line.itemId, qty: line.qty, unitCost: line.unitCost, vatAmount: vat, lineTotal: lineSubtotal + vat });
    }

    const totalQty = body.lines.reduce((s: number, l: any) => s + Number(l.qty), 0);
    const landingCostPerUnit = totalQty > 0
      ? (Number(body.customsDuty ?? 0) + Number(body.shippingCost ?? 0)) / totalQty : 0;
    const customsDuty = Number(body.customsDuty ?? 0);
    const shippingCost = Number(body.shippingCost ?? 0);
    const totalAed = (subtotal + inputVat + customsDuty + shippingCost) * Number(body.exchangeRate ?? 1);

    const po = await prisma.purchaseOrder.create({
      data: {
        number, supplierId: body.supplierId, status: "RECEIVED",
        currency: body.currency ?? "AED", exchangeRate: body.exchangeRate ?? 1,
        subtotalAed: subtotal, inputVat, customsDuty, shippingCost, totalAed, isRcm,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    // Update stock — compensate on journal failure
    const stockSnapshots: { id: string; stockQty: number; weightedAvgCost: number }[] = [];
    try {
      for (const line of po.lines) {
        const item = await prisma.item.findUniqueOrThrow({ where: { id: line.itemId } });
        stockSnapshots.push({ id: item.id, stockQty: Number(item.stockQty), weightedAvgCost: Number(item.weightedAvgCost) });
        const newQty = Number(item.stockQty) + Number(line.qty);
        const newAvgCost = (Number(item.weightedAvgCost) * Number(item.stockQty) +
          (Number(line.unitCost) + landingCostPerUnit) * Number(line.qty)) / newQty;
        await prisma.item.update({ where: { id: item.id }, data: { stockQty: newQty, weightedAvgCost: newAvgCost } });
      }

      const journalLines: any[] = [{ accountCode: "1300", type: "DEBIT", amount: subtotal }];
      if (inputVat > 0) journalLines.push({ accountCode: "1200", type: "DEBIT", amount: inputVat });
      if (isRcm) {
        const rcmVat = subtotal * VAT_RATE;
        journalLines.push({ accountCode: "1200", type: "DEBIT", amount: rcmVat });
        journalLines.push({ accountCode: "2200", type: "CREDIT", amount: rcmVat });
      }
      if (customsDuty + shippingCost > 0)
        journalLines.push({ accountCode: "5200", type: "DEBIT", amount: customsDuty + shippingCost });
      journalLines.push({ accountCode: "2000", type: "CREDIT", amount: totalAed });

      await postJournal(po.number, `Purchase from ${supplier.name}`, new Date(), journalLines);
    } catch (innerErr) {
      // Compensate: restore stock, delete PO
      for (const snap of stockSnapshots)
        await prisma.item.update({ where: { id: snap.id }, data: { stockQty: snap.stockQty, weightedAvgCost: snap.weightedAvgCost } }).catch(() => {});
      await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: po.id } }).catch(() => {});
      await prisma.purchaseOrder.delete({ where: { id: po.id } }).catch(() => {});
      throw innerErr;
    }

    return NextResponse.json(po, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
