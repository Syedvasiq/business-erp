import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
    include: { customer: true, payments: true },
  });

  const map = new Map<string, { id: string; name: string; totalInvoiced: number; totalPaid: number; b1_30: number; b31_60: number; b61_90: number; over90: number }>();

  for (const inv of invoices) {
    const paid    = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, Number(inv.totalAed) - paid);
    if (balance <= 0) continue;
    const days = Math.floor((today.getTime() - new Date(inv.issueDate).getTime()) / 86400000);
    if (!map.has(inv.customerId))
      map.set(inv.customerId, { id: inv.customerId, name: inv.customer.name, totalInvoiced: 0, totalPaid: 0, b1_30: 0, b31_60: 0, b61_90: 0, over90: 0 });
    const row = map.get(inv.customerId)!;
    row.totalInvoiced += Number(inv.totalAed);
    row.totalPaid     += paid;
    if (days <= 30)      row.b1_30  += balance;
    else if (days <= 60) row.b31_60 += balance;
    else if (days <= 90) row.b61_90 += balance;
    else                 row.over90 += balance;
  }

  return NextResponse.json(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
}
