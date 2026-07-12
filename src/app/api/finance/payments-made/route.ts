import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");

  const payments = await prisma.payment.findMany({
    where: {
      purchaseOrderId: { not: null },
      ...(supplierId ? { purchaseOrder: { supplierId } } : {}),
    },
    include: {
      purchaseOrder: { include: { supplier: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}
