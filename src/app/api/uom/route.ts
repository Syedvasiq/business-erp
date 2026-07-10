import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const uoms = await prisma.uomSetting.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(uoms);
}

export async function POST(req: NextRequest) {
  const { code, label } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });
  const uom = await prisma.uomSetting.create({
    data: { code: code.trim().toUpperCase(), label: label?.trim() || code.trim().toUpperCase() },
  });
  return NextResponse.json(uom, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.uomSetting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const { id, code, label } = await req.json();
  const uom = await prisma.uomSetting.update({
    where: { id },
    data: { code: code.trim().toUpperCase(), label: label?.trim() || code.trim().toUpperCase() },
  });
  return NextResponse.json(uom);
}
