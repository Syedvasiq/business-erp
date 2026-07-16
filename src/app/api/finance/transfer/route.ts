import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { fromId, toId, amount, date, description } = await req.json();

  if (!fromId || !toId || !amount || fromId === toId) {
    return NextResponse.json({ error: "Invalid transfer parameters." }, { status: 400 });
  }

  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });

  const txnDate = new Date(date);
  const reference = `TRF-${Date.now()}`;
  const desc = description || "Cash transfer";

  // Get Cash & Bank GL account (code 1000)
  const cashAccount = await prisma.account.findUnique({ where: { code: "1000" } });
  if (!cashAccount) return NextResponse.json({ error: "Cash & Bank account (1000) not found in chart of accounts." }, { status: 500 });

  // Run everything in a transaction
  await prisma.$transaction([
    // DEBIT from account (money out)
    prisma.bankTransaction.create({
      data: { bankAccountId: fromId, amount: amt, type: "DEBIT", date: txnDate, description: desc, reference },
    }),
    // CREDIT to account (money in)
    prisma.bankTransaction.create({
      data: { bankAccountId: toId, amount: amt, type: "CREDIT", date: txnDate, description: desc, reference },
    }),
    // Journal entry: DR Cash & Bank / CR Cash & Bank (internal transfer)
    prisma.journal.create({
      data: {
        reference,
        description: desc,
        date: txnDate,
        lines: {
          create: [
            { accountId: cashAccount.id, type: "DEBIT",  amount: amt, aedAmount: amt, currency: "AED" },
            { accountId: cashAccount.id, type: "CREDIT", amount: amt, aedAmount: amt, currency: "AED" },
          ],
        },
      },
    }),
  ]);

  return NextResponse.json({ success: true, reference });
}

export async function GET() {
  const journals = await prisma.journal.findMany({
    where: { reference: { startsWith: "TRF-" } },
    orderBy: { date: "desc" },
    include: { lines: { include: { account: { select: { code: true, name: true } } } } },
  });

  // Get bank transactions grouped by reference
  const refs = journals.map((j) => j.reference);
  const txns = await prisma.bankTransaction.findMany({
    where: { reference: { in: refs } },
    include: { bankAccount: { select: { id: true, name: true } } },
  });

  const result = journals.map((j) => {
    const related = txns.filter((t) => t.reference === j.reference);
    const from = related.find((t) => t.type === "DEBIT");
    const to   = related.find((t) => t.type === "CREDIT");
    return { ...j, fromAccount: from?.bankAccount ?? null, toAccount: to?.bankAccount ?? null, amount: from?.amount ?? 0 };
  });

  return NextResponse.json(result);
}
