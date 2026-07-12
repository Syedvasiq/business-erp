import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const accounts = await prisma.bankAccount.findMany({
    include: { transactions: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "asc" },
  });

  const result = accounts.map((a) => {
    const credits = a.transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + Number(t.amount), 0);
    const debits  = a.transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0);
    const balance = Number(a.openingBalance) + credits - debits;
    return { ...a, currentBalance: balance, transactionCount: a.transactions.length };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const account = await prisma.bankAccount.create({
    data: {
      name: body.name,
      bankName: body.bankName,
      accountNumber: body.accountNumber || null,
      currency: body.currency || "AED",
      openingBalance: body.openingBalance || 0,
    },
  });
  return NextResponse.json(account, { status: 201 });
}
