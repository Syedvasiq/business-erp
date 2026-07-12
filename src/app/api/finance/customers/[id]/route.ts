import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        where: { status: { not: "CANCELLED" } },
        include: { payments: { orderBy: { date: "asc" } } },
        orderBy: { issueDate: "asc" },
      },
      creditNotes: {
        where: { type: "CUSTOMER" },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build statement rows with running balance
  type Row = {
    date: Date;
    type: string;
    reference: string;
    description: string;
    debit: number;   // amount owed (invoice)
    credit: number;  // amount paid/credited
    balance: number;
    status?: string;
    paymentMethod?: string;
  };

  const rows: Row[] = [];
  let runningBalance = 0;

  // Merge invoices, payments, credit notes sorted by date
  const events: { date: Date; kind: string; data: any }[] = [];

  for (const inv of customer.invoices) {
    events.push({ date: new Date(inv.issueDate), kind: "invoice", data: inv });
    for (const pay of inv.payments) {
      events.push({ date: new Date(pay.date), kind: "payment", data: { ...pay, invoiceNumber: inv.number } });
    }
  }
  for (const cn of customer.creditNotes) {
    events.push({ date: new Date(cn.date), kind: "credit", data: cn });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const ev of events) {
    if (ev.kind === "invoice") {
      const inv = ev.data;
      runningBalance += Number(inv.totalAed);
      rows.push({
        date: ev.date,
        type: "Invoice",
        reference: inv.number,
        description: `Invoice ${inv.number}`,
        debit: Number(inv.totalAed),
        credit: 0,
        balance: runningBalance,
        status: inv.status,
      });
    } else if (ev.kind === "payment") {
      const pay = ev.data;
      runningBalance -= Number(pay.amount);
      rows.push({
        date: ev.date,
        type: "Payment",
        reference: pay.invoiceNumber,
        description: `Payment for ${pay.invoiceNumber} via ${pay.method}`,
        debit: 0,
        credit: Number(pay.amount),
        balance: runningBalance,
        paymentMethod: pay.method,
      });
    } else if (ev.kind === "credit") {
      const cn = ev.data;
      const total = Number(cn.amount) + Number(cn.vatAmount);
      runningBalance -= total;
      rows.push({
        date: ev.date,
        type: "Credit Note",
        reference: cn.number,
        description: `Credit Note: ${cn.reason}`,
        debit: 0,
        credit: total,
        balance: runningBalance,
      });
    }
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      trn: customer.trn,
    },
    rows,
    summary: {
      totalInvoiced: rows.filter((r) => r.type === "Invoice").reduce((s, r) => s + r.debit, 0),
      totalPaid: rows.filter((r) => r.type === "Payment").reduce((s, r) => s + r.credit, 0),
      totalCredits: rows.filter((r) => r.type === "Credit Note").reduce((s, r) => s + r.credit, 0),
      balance: runningBalance,
    },
  });
}
