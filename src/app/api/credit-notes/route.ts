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
  const type = searchParams.get("type");
  const notes = await prisma.creditNote.findMany({
    where: type ? { type: type as any } : undefined,
    include: { customer: true, supplier: true, invoice: true, purchaseOrder: true },
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

  const cn = await prisma.creditNote.create({
    data: {
      number,
      type: body.type,
      customerId: body.customerId || null,
      supplierId: body.supplierId || null,
      invoiceId: body.invoiceId || null,
      purchaseOrderId: body.purchaseOrderId || null,
      amount,
      vatAmount,
      reason: body.reason,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });

  const journalLines =
    body.type === "CUSTOMER"
      ? [
          { accountCode: "1100", type: "CREDIT" as const, amount: total },
          { accountCode: "4000", type: "DEBIT"  as const, amount: amount },
          ...(vatAmount > 0 ? [{ accountCode: "2100", type: "DEBIT" as const, amount: vatAmount }] : []),
        ]
      : [
          { accountCode: "2000", type: "DEBIT"  as const, amount: total },
          { accountCode: "1300", type: "CREDIT" as const, amount: amount },
          ...(vatAmount > 0 ? [{ accountCode: "1200", type: "CREDIT" as const, amount: vatAmount }] : []),
        ];

  try {
    await postJournal(number, `Credit Note — ${body.reason}`, cn.date, journalLines);
  } catch (journalErr) {
    await prisma.creditNote.delete({ where: { id: cn.id } }).catch(() => {});
    throw journalErr;
  }

  return NextResponse.json(cn, { status: 201 });
}

// Mark invoice as PAID
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (body.invoiceId) {
    const inv = await prisma.invoice.update({ where: { id: body.invoiceId }, data: { status: "PAID" } });
    const pmtRef = `PMT-${inv.number}`;
    const existingPmt = await prisma.journal.findUnique({ where: { reference: pmtRef } });
    if (!existingPmt) {
      await postJournal(pmtRef, `Payment received — ${inv.number}`, new Date(), [
        { accountCode: "1000", type: "DEBIT"  as const, amount: Number(inv.totalAed) },
        { accountCode: "1100", type: "CREDIT" as const, amount: Number(inv.totalAed) },
      ]);
    }
    return NextResponse.json(inv);
  }

  if (body.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: body.purchaseOrderId } });
    const pmtRef = `PMT-${po.number}`;
    const existingPmt = await prisma.journal.findUnique({ where: { reference: pmtRef } });
    if (!existingPmt) {
      await postJournal(pmtRef, `Payment to supplier — ${po.number}`, new Date(), [
        { accountCode: "2000", type: "DEBIT"  as const, amount: Number(po.totalAed) },
        { accountCode: "1000", type: "CREDIT" as const, amount: Number(po.totalAed) },
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Missing invoiceId or purchaseOrderId" }, { status: 400 });
}
