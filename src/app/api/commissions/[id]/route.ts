import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commission = await prisma.commission.findUnique({
    where: { id },
    include: { agent: true, invoice: true },
  });
  if (!commission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(commission);
}

export async function PUT(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commission = await prisma.commission.findUniqueOrThrow({ where: { id } });
  if (commission.isPaid) return NextResponse.json({ error: "Already paid" }, { status: 409 });

  const ref = `COMM-PAY-${id.slice(0, 8)}`;
  const existingJournal = await prisma.journal.findUnique({ where: { reference: ref } });

  await prisma.commission.update({ where: { id }, data: { isPaid: true } });

  if (!existingJournal) {
    await postJournal(ref, `Commission payout`, new Date(), [
      { accountCode: "2300", type: "DEBIT",  amount: Number(commission.totalPayout) },
      { accountCode: "1000", type: "CREDIT", amount: Number(commission.totalPayout) },
    ]);
  }

  return NextResponse.json({ success: true });
}
