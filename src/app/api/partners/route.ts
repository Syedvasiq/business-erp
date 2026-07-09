import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const partners = await prisma.partner.findMany({
    include: { withdrawals: { orderBy: { date: "desc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const partner = await prisma.partner.create({
    data: {
      name:         body.name,
      email:        body.email ?? null,
      sharePercent: body.sharePercent,
    },
  });
  return NextResponse.json(partner, { status: 201 });
}
