import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        where: { status: { not: "CANCELLED" } },
        include: { payments: { orderBy: { date: "asc" } } },
        orderBy: { orderDate: "asc" },
      },
      creditNotes: {
        where: { type: "SUPPLIER" },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events: { date: Date; kind: string; data: any }[] = [];

  for (const po of supplier.purchaseOrders) {
    events.push({ date: new Date(po.orderDate), kind: "po", data: po });
    for (const pay of po.payments) {
      events.push({ date: new Date(pay.date), kind: "payment", data: { ...pay, poNumber: po.number } });
    }
  }
  for (const dn of supplier.creditNotes) {
    events.push({ date: new Date(dn.date), kind: "debit", data: dn });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const rows: any[] = [];

  for (const ev of events) {
    if (ev.kind === "po") {
      runningBalance += Number(ev.data.totalAed);
      rows.push({
        date: ev.date,
        type: "Purchase Order",
        reference: ev.data.number,
        description: `Purchase Order ${ev.data.number}`,
        debit: Number(ev.data.totalAed),
        credit: 0,
        balance: runningBalance,
        status: ev.data.status,
      });
    } else if (ev.kind === "payment") {
      runningBalance -= Number(ev.data.amount);
      rows.push({
        date: ev.date,
        type: "Payment",
        reference: ev.data.poNumber,
        description: `Payment for ${ev.data.poNumber} via ${ev.data.method}`,
        debit: 0,
        credit: Number(ev.data.amount),
        balance: runningBalance,
        paymentMethod: ev.data.method,
      });
    } else if (ev.kind === "debit") {
      const total = Number(ev.data.amount) + Number(ev.data.vatAmount);
      runningBalance -= total;
      rows.push({
        date: ev.date,
        type: "Debit Note",
        reference: ev.data.number,
        description: `Debit Note: ${ev.data.reason}`,
        debit: 0,
        credit: total,
        balance: runningBalance,
      });
    }
  }

  return NextResponse.json({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      trn: supplier.trn,
      vendorType: supplier.vendorType,
    },
    rows,
    summary: {
      totalOrdered: rows.filter((r) => r.type === "Purchase Order").reduce((s, r) => s + r.debit, 0),
      totalPaid: rows.filter((r) => r.type === "Payment").reduce((s, r) => s + r.credit, 0),
      totalDebits: rows.filter((r) => r.type === "Debit Note").reduce((s, r) => s + r.credit, 0),
      balance: runningBalance,
    },
  });
}
