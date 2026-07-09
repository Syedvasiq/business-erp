import { prisma } from "./prisma";
import { JournalEntryType, CurrencyCode } from "@prisma/client";

interface JournalLineInput {
  accountCode: string;
  type: JournalEntryType;
  amount: number;
  currency?: CurrencyCode;
  aedAmount?: number;
}

export async function postJournal(
  reference: string,
  description: string,
  date: Date,
  lines: JournalLineInput[]
) {
  const totalDebits = lines
    .filter((l) => l.type === "DEBIT")
    .reduce((s, l) => s + (l.aedAmount ?? l.amount), 0);
  const totalCredits = lines
    .filter((l) => l.type === "CREDIT")
    .reduce((s, l) => s + (l.aedAmount ?? l.amount), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Journal imbalanced: debits ${totalDebits} ≠ credits ${totalCredits}`
    );
  }

  const accounts = await prisma.account.findMany({
    where: { code: { in: lines.map((l) => l.accountCode) } },
  });

  const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

  const journal = await prisma.journal.create({
    data: {
      reference,
      description,
      date,
      lines: {
        create: lines.map((l) => ({
          accountId: accountMap.get(l.accountCode)!,
          type: l.type,
          amount: l.amount,
          currency: l.currency ?? "AED",
          aedAmount: l.aedAmount ?? l.amount,
        })),
      },
    },
  });

  return journal;
}
