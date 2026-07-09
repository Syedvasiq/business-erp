import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTRN } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { invoices: { orderBy: { issueDate: "desc" }, include: { lines: true } } },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (body.trn && !validateTRN(body.trn)) {
    return NextResponse.json({ error: "Invalid TRN: must be 15 digits" }, { status: 400 });
  }
  const customer = await prisma.customer.update({ where: { id }, data: body });
  return NextResponse.json(customer);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceCount = await prisma.invoice.count({ where: { customerId: id } });
  if (invoiceCount > 0) {
    return NextResponse.json({ error: "Cannot delete customer with existing invoices" }, { status: 409 });
  }
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
