import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";
import { getSettings } from "@/lib/settings";

async function nextNumber() {
  const count = await prisma.creditNote.count();
  return `CN-${String(count + 1).padStart(5, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // CUSTOMER | SUPPLIER
  const notes = await prisma.creditNote.findMany({
    where: type ? { type: type as any } : undefined,
    include: { customer: true, supplier: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vatRate: vatRatePct } = await getSettings();
  const VAT_RATE = vatRatePct / 100;

  const number = await nextNumber();
  const amount = Number(body.amount);
  const vatAmount = body.includeVat ? parseFloat((amount * VAT_RATE).toFixed(2)) : 0;
  const total = amount + vatAmount;

  const note = await prisma.$transaction(async (tx) => {
    const cn = await tx.creditNote.create({
      data: {
        number,
        type: body.type,
        customerId: body.customerId || null,
        supplierId: body.supplierId || null,
        amount,
        vatAmount,
        reason: body.reason,
        date: body.date ? new Date(body.date) : new Date(),
      },
    });

    // Journal entries
    // CUSTOMER credit note: DR Output VAT (if any) + DR Sales Revenue / CR Accounts Receivable
    // SUPPLIER credit note: DR Accounts Payable / CR Input VAT (if any) + CR Inventory/Expense
    const journalLines =
      body.type === "CUSTOMER"
        ? [
            { accountCode: "1100", type: "CREDIT" as const, amount: total },   // CR AR
            { accountCode: "4000", type: "DEBIT"  as const, amount: amount },  // DR Sales Revenue
            ...(vatAmount > 0
              ? [{ accountCode: "2100", type: "DEBIT" as const, amount: vatAmount }] // DR Output VAT
              : []),
          ]
        : [
            { accountCode: "2000", type: "DEBIT"  as const, amount: total },   // DR AP
            { accountCode: "1300", type: "CREDIT" as const, amount: amount },  // CR Inventory
            ...(vatAmount > 0
              ? [{ accountCode: "1200", type: "CREDIT" as const, amount: vatAmount }] // CR Input VAT
              : []),
          ];

    await postJournal(number, `Credit Note — ${body.reason}`, cn.date, journalLines);

    return cn;
  });

  return NextResponse.json(note, { status: 201 });
}
