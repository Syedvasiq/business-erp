import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchaseOrders: {
        where: { status: { not: "CANCELLED" } },
        include: { payments: true },
      },
      creditNotes: { where: { type: "SUPPLIER" } },
    },
    orderBy: { name: "asc" },
  });

  const result = suppliers.map((s) => {
    const totalOrdered = s.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAed), 0);
    const totalPaid = s.purchaseOrders.reduce(
      (sum, po) => sum + po.payments.reduce((ps, p) => ps + Number(p.amount), 0),
      0
    );
    const totalDebits = s.creditNotes.reduce(
      (sum, dn) => sum + Number(dn.amount) + Number(dn.vatAmount),
      0
    );
    const balance = totalOrdered - totalPaid - totalDebits;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      trn: s.trn,
      vendorType: s.vendorType,
      totalOrdered,
      totalPaid,
      totalDebits,
      balance,
      poCount: s.purchaseOrders.length,
    };
  });

  return NextResponse.json(result);
}
