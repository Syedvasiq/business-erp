import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const expenses = await prisma.expense.findMany({
    where: from && to
      ? { date: { gte: new Date(from), lte: new Date(to) } }
      : undefined,
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, category, amount, date, reference } = body;

  if (!description || !amount) {
    return NextResponse.json({ error: "description and amount are required" }, { status: 400 });
  }

  const exp = await prisma.expense.create({
    data: {
      description,
      category: category ?? "OTHER",
      amount:    Number(amount),
      date:      date ? new Date(date) : new Date(),
      reference: reference ?? null,
    },
  });

  const ref = `EXP-${exp.id.slice(0, 8)}`;

  // Post journal OUTSIDE transaction to avoid Neon deadlock
  await postJournal(ref, description, new Date(exp.date), [
    { accountCode: "5300", type: "DEBIT",  amount: Number(amount) },
    { accountCode: "1000", type: "CREDIT", amount: Number(amount) },
  ]);

  await prisma.expense.update({ where: { id: exp.id }, data: { journalRef: ref } });

  return NextResponse.json(exp, { status: 201 });
}
