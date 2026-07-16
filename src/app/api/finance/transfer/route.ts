import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { fromId, fromType, toId, toType, amount, date, description } = await req.json();

  if (!fromId || !toId || !amount || (fromId === toId && fromType === toType)) {
    return NextResponse.json({ error: "Invalid transfer parameters." }, { status: 400 });
  }

  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });

  const txnDate  = new Date(date);
  const reference = `TRF-${Date.now()}`;
  const desc = description || "Cash transfer";

  // Resolve GL account IDs for journal lines
  const getGlId = async (id: string, type: string) => {
    if (type === "gl") return id; // already a GL account id
    // For bank accounts, use Cash & Bank 1000
    const acc = await prisma.account.findUnique({ where: { code: "1000" } });
    if (!acc) throw new Error("Cash & Bank account (1000) not found.");
    return acc.id;
  };

  try {
    const fromGlId = await getGlId(fromId, fromType);
    const toGlId   = await getGlId(toId, toType);

    const ops: any[] = [];

    // Bank transactions only for bank-type sides
    if (fromType === "bank") {
      ops.push(prisma.bankTransaction.create({
        data: { bankAccountId: fromId, amount: amt, type: "DEBIT", date: txnDate, description: desc, reference },
      }));
    }
    if (toType === "bank") {
      ops.push(prisma.bankTransaction.create({
        data: { bankAccountId: toId, amount: amt, type: "CREDIT", date: txnDate, description: desc, reference },
      }));
    }

    // Journal entry: CR from-GL, DR to-GL
    ops.push(prisma.journal.create({
      data: {
        reference,
        description: desc,
        date: txnDate,
        lines: {
          create: [
            { accountId: toGlId,   type: "DEBIT",  amount: amt, aedAmount: amt, currency: "AED" },
            { accountId: fromGlId, type: "CREDIT", amount: amt, aedAmount: amt, currency: "AED" },
          ],
        },
      },
    }));

    await prisma.$transaction(ops);
    return NextResponse.json({ success: true, reference });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  const journals = await prisma.journal.findMany({
    where: { reference: { startsWith: "TRF-" } },
    orderBy: { date: "desc" },
    include: { lines: { include: { account: { select: { code: true, name: true } } } } },
  });

  const refs = journals.map((j) => j.reference);
  const txns = await prisma.bankTransaction.findMany({
    where: { reference: { in: refs } },
    include: { bankAccount: { select: { id: true, name: true } } },
  });

  const result = journals.map((j) => {
    const related = txns.filter((t) => t.reference === j.reference);
    const from = related.find((t) => t.type === "DEBIT");
    const to   = related.find((t) => t.type === "CREDIT");

    // Fallback to journal line account names when no bank txn exists (GL-to-GL or GL side)
    const fromName = from?.bankAccount?.name
      ?? j.lines.find((l) => l.type === "CREDIT")?.account?.name
      ?? "—";
    const toName = to?.bankAccount?.name
      ?? j.lines.find((l) => l.type === "DEBIT")?.account?.name
      ?? "—";

    return {
      ...j,
      fromAccount: { name: fromName },
      toAccount:   { name: toName },
      amount: from?.amount ?? j.lines.find((l) => l.type === "DEBIT")?.amount ?? 0,
    };
  });

  return NextResponse.json(result);
}
