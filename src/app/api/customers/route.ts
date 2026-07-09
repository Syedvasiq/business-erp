import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTRN } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const customers = await prisma.customer.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { trn: { contains: search } }] }
      : {},
    include: {
      invoices: { select: { totalAed: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.trn && !validateTRN(body.trn)) {
    return NextResponse.json({ error: "Invalid TRN: must be 15 digits" }, { status: 400 });
  }
  const customer = await prisma.customer.create({ data: body });
  return NextResponse.json(customer, { status: 201 });
}
