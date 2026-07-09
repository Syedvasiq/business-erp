import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";
import { generateDocNumber, VAT_RATE } from "@/lib/utils";

export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    include: { supplier: true, lines: { include: { item: true } } },
    orderBy: { orderDate: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.purchaseOrder.count();
    const number = generateDocNumber("PO", count + 1);

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

    const po = await tx.purchaseOrder.create({
      data: {
        number,
        supplierId: body.supplierId,
        status: "RECEIVED",
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

    // Update stock and weighted average cost
    for (const line of po.lines) {
      const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
      const newQty = Number(item.stockQty) + Number(line.qty);
      const newAvgCost =
        (Number(item.weightedAvgCost) * Number(item.stockQty) +
          (Number(line.unitCost) + landingCostPerUnit) * Number(line.qty)) /
        newQty;

      await tx.item.update({
        where: { id: line.itemId },
        data: { stockQty: newQty, weightedAvgCost: newAvgCost },
      });
    }

    // Double-entry journal
    const journalLines: any[] = [
      { accountCode: "1300", type: "DEBIT", amount: subtotal },
      { accountCode: "2000", type: "CREDIT", amount: totalAed },
    ];

    if (inputVat > 0) {
      journalLines.push({ accountCode: "1200", type: "DEBIT", amount: inputVat });
    }
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

    await postJournal(po.number, `Purchase from ${supplier.name}`, new Date(), journalLines);

    return po;
  });

  return NextResponse.json(result, { status: 201 });
}
