import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // e.g. ASSET, LIABILITY, etc.

  const accounts = await prisma.account.findMany({
    where: type ? { type: type as any } : {},
    include: {
      journalLines: { select: { type: true, aedAmount: true } },
    },
    orderBy: { code: "asc" },
  });

  const result = accounts.map((a) => {
    // Normal balance: ASSET/EXPENSE = DEBIT positive, LIABILITY/EQUITY/REVENUE = CREDIT positive
    const normalDebit = a.type === "ASSET" || a.type === "EXPENSE";
    const balance = a.journalLines.reduce((sum, l) => {
      const amt = Number(l.aedAmount);
      if (normalDebit) return sum + (l.type === "DEBIT" ? amt : -amt);
      return sum + (l.type === "CREDIT" ? amt : -amt);
    }, 0);

    return { id: a.id, code: a.code, name: a.name, type: a.type, balance };
  });

  return NextResponse.json(result);
}
