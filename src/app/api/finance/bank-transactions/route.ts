import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bankAccountId = searchParams.get("bankAccountId");

  const txns = await prisma.bankTransaction.findMany({
    where: bankAccountId ? { bankAccountId } : {},
    include: { bankAccount: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(txns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const txn = await prisma.bankTransaction.create({
    data: {
      bankAccountId: body.bankAccountId,
      date: new Date(body.date),
      description: body.description,
      amount: body.amount,
      type: body.type,
      reference: body.reference || null,
    },
  });
  return NextResponse.json(txn, { status: 201 });
}
