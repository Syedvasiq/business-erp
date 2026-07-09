import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const items = await prisma.item.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search } }] }
      : {},
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { supplierId, ...rest } = body;
  const item = await prisma.item.create({
    data: {
      ...rest,
      weightedAvgCost: body.unitCost,
      ...(supplierId ? { supplierId } : {}),
    },
  });
  return NextResponse.json(item, { status: 201 });
}
