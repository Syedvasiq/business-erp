import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: body.status },
  });
  return NextResponse.json(po);
}
