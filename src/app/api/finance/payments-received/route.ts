import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  const payments = await prisma.payment.findMany({
    where: {
      invoiceId: { not: null },
      ...(customerId ? { invoice: { customerId } } : {}),
    },
    include: {
      invoice: { include: { customer: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}
