import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const template = await prisma.recurringTemplate.update({
    where: { id },
    data: {
      name: body.name,
      frequency: body.frequency,
      nextRunDate: body.nextRunDate ? new Date(body.nextRunDate) : undefined,
      isActive: body.isActive ?? true,
      payload: body.payload,
    },
  });
  return NextResponse.json(template);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.recurringTemplate.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
