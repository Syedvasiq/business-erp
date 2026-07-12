import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notes = await prisma.creditNote.findMany({
    where: { type: "SUPPLIER" },
    include: { supplier: true, purchaseOrder: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(notes.map((dn) => ({
    id: dn.id, number: dn.number, date: dn.date,
    supplierId: dn.supplierId, supplierName: dn.supplier?.name ?? null,
    poNumber: dn.purchaseOrder?.number ?? null,
    amount: Number(dn.amount), vatAmount: Number(dn.vatAmount), reason: dn.reason,
  })));
}

export async function POST(req: NextRequest) {
  const { supplierId, purchaseOrderId, amount, vatAmount, reason, date } = await req.json();
  const count = await prisma.creditNote.count();
  const number = `DN-${String(count + 1).padStart(5, "0")}`;
  const dn = await prisma.creditNote.create({
    data: {
      number, type: "SUPPLIER",
      supplierId: supplierId || null,
      purchaseOrderId: purchaseOrderId || null,
      amount, vatAmount: vatAmount ?? 0, reason,
      date: date ? new Date(date) : new Date(),
    },
  });
  return NextResponse.json(dn, { status: 201 });
}
