import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // Strip fields managed by the system — never allow direct overwrite
  const { stockQty: _sq, weightedAvgCost: _wac, ...safeData } = body;
  const item = await prisma.item.update({ where: { id }, data: safeData });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usedInSales = await prisma.invoiceLine.count({ where: { itemId: id } });
  if (usedInSales > 0) {
    return NextResponse.json({ error: "Item has sales history, cannot delete" }, { status: 409 });
  }
  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
