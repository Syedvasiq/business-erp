import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const txn = await prisma.bankTransaction.update({
    where: { id },
    data: {
      reconciled: body.reconciled ?? false,
      paymentId: body.paymentId || null,
    },
  });
  return NextResponse.json(txn);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.bankTransaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
