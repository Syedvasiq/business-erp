import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { reference, description, date, lines } = await req.json();

  if (!reference || !description || !lines?.length) {
    return NextResponse.json({ error: "reference, description and lines are required" }, { status: 400 });
  }

  // Validate balance
  const totalDr = lines.filter((l: { type: string }) => l.type === "DEBIT").reduce((s: number, l: { amount: number }) => s + l.amount, 0);
  const totalCr = lines.filter((l: { type: string }) => l.type === "CREDIT").reduce((s: number, l: { amount: number }) => s + l.amount, 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    return NextResponse.json({ error: `Journal imbalanced: DR ${totalDr} ≠ CR ${totalCr}` }, { status: 422 });
  }

  // Check reference uniqueness
  const existing = await prisma.journal.findUnique({ where: { reference } });
  if (existing) {
    return NextResponse.json({ error: `Reference "${reference}" already exists` }, { status: 409 });
  }

  const journal = await prisma.journal.create({
    data: {
      reference,
      description,
      date: date ? new Date(date) : new Date(),
      lines: {
        create: lines.map((l: { accountId: string; type: "DEBIT" | "CREDIT"; amount: number }) => ({
          accountId: l.accountId,
          type: l.type,
          amount: l.amount,
          aedAmount: l.amount,
          currency: "AED",
        })),
      },
    },
  });

  return NextResponse.json(journal, { status: 201 });
}
