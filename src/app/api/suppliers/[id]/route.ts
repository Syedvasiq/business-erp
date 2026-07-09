import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { purchaseOrders: { orderBy: { orderDate: "desc" } } },
  });
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supplier = await prisma.supplier.update({ where: { id }, data: body });
  return NextResponse.json(supplier);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id } });
  if (poCount > 0) {
    return NextResponse.json({ error: "Cannot delete supplier with existing purchase orders" }, { status: 409 });
  }
  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
