import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date();
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["RECEIVED", "PARTIALLY_PAID"] } },
    include: { supplier: true, payments: true },
  });

  const map = new Map<string, { id: string; name: string; totalOrdered: number; totalPaid: number; b1_30: number; b31_60: number; b61_90: number; over90: number }>();

  for (const po of orders) {
    const paid    = po.payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, Number(po.totalAed) - paid);
    if (balance <= 0) continue;
    const days = Math.floor((today.getTime() - new Date(po.orderDate).getTime()) / 86400000);
    if (!map.has(po.supplierId))
      map.set(po.supplierId, { id: po.supplierId, name: po.supplier.name, totalOrdered: 0, totalPaid: 0, b1_30: 0, b31_60: 0, b61_90: 0, over90: 0 });
    const row = map.get(po.supplierId)!;
    row.totalOrdered += Number(po.totalAed);
    row.totalPaid    += paid;
    if (days <= 30)      row.b1_30  += balance;
    else if (days <= 60) row.b31_60 += balance;
    else if (days <= 90) row.b61_90 += balance;
    else                 row.over90 += balance;
  }

  return NextResponse.json(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
}
