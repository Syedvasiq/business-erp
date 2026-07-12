import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      name: body.name,
      bankName: body.bankName,
      accountNumber: body.accountNumber || null,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(account);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
