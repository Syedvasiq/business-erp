import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      description: body.description,
      category: body.category,
      amount: body.amount,
      date: body.date ? new Date(body.date) : undefined,
      reference: body.reference ?? null,
    },
  });
  return NextResponse.json(expense);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id } });

  await prisma.expense.delete({ where: { id } });

  // Post reversal journal so P&L stays accurate
  const revRef = `EXP-REV-${id.slice(0, 8)}`;
  const existingRev = await prisma.journal.findUnique({ where: { reference: revRef } });
  if (!existingRev) {
    await postJournal(revRef, `Reversal: ${expense.description}`, new Date(), [
      { accountCode: "1000", type: "DEBIT",  amount: Number(expense.amount) },
      { accountCode: "5300", type: "CREDIT", amount: Number(expense.amount) },
    ]);
  }

  return NextResponse.json({ success: true });
}
