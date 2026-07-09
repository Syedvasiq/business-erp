import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";

// POST /api/partners/[id]  → record a withdrawal for this partner
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const withdrawal = await prisma.$transaction(async (tx) => {
    const partner = await tx.partner.findUniqueOrThrow({ where: { id } });

    const w = await tx.partnerWithdrawal.create({
      data: {
        partnerId: partner.id,
        amount:    body.amount,
        note:      body.note ?? null,
        date:      body.date ? new Date(body.date) : new Date(),
      },
    });

    // DR Partner Equity (3000) / CR Cash & Bank (1000)
    const journal = await postJournal(
      `WDRAW-${w.id.slice(0, 8)}`,
      `Partner withdrawal — ${partner.name}${body.note ? `: ${body.note}` : ""}`,
      new Date(w.date),
      [
        { accountCode: "3000", type: "DEBIT",  amount: Number(w.amount) },
        { accountCode: "1000", type: "CREDIT", amount: Number(w.amount) },
      ]
    );

    return tx.partnerWithdrawal.update({
      where: { id: w.id },
      data:  { journalRef: journal.reference },
    });
  });

  return NextResponse.json(withdrawal, { status: 201 });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.partner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
