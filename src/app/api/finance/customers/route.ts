import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customers = await prisma.customer.findMany({
    include: {
      invoices: {
        where: { status: { not: "CANCELLED" } },
        include: { payments: true },
      },
      creditNotes: { where: { type: "CUSTOMER" } },
    },
    orderBy: { name: "asc" },
  });

  const result = customers.map((c) => {
    const totalInvoiced = c.invoices.reduce((s, i) => s + Number(i.totalAed), 0);
    const totalPaid = c.invoices.reduce(
      (s, i) => s + i.payments.reduce((ps, p) => ps + Number(p.amount), 0),
      0
    );
    const totalCredits = c.creditNotes.reduce(
      (s, cn) => s + Number(cn.amount) + Number(cn.vatAmount),
      0
    );
    const balance = totalInvoiced - totalPaid - totalCredits;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      trn: c.trn,
      totalInvoiced,
      totalPaid,
      totalCredits,
      balance,
      invoiceCount: c.invoices.length,
    };
  });

  return NextResponse.json(result);
}
