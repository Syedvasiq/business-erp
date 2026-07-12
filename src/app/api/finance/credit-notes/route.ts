import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notes = await prisma.creditNote.findMany({
    where: { type: "CUSTOMER" },
    include: { customer: true, invoice: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(notes.map((cn) => ({
    id: cn.id, number: cn.number, date: cn.date,
    customerId: cn.customerId, customerName: cn.customer?.name ?? null,
    invoiceNumber: cn.invoice?.number ?? null,
    amount: Number(cn.amount), vatAmount: Number(cn.vatAmount), reason: cn.reason,
  })));
}

export async function POST(req: NextRequest) {
  const { customerId, invoiceId, amount, vatAmount, reason, date } = await req.json();
  const count = await prisma.creditNote.count();
  const number = `CN-${String(count + 1).padStart(5, "0")}`;
  const cn = await prisma.creditNote.create({
    data: {
      number, type: "CUSTOMER",
      customerId: customerId || null,
      invoiceId: invoiceId || null,
      amount, vatAmount: vatAmount ?? 0, reason,
      date: date ? new Date(date) : new Date(),
    },
  });
  return NextResponse.json(cn, { status: 201 });
}
