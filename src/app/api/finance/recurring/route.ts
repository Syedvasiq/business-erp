import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.recurringTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const template = await prisma.recurringTemplate.create({
    data: {
      type: body.type,
      name: body.name,
      frequency: body.frequency,
      nextRunDate: new Date(body.nextRunDate),
      isActive: true,
      payload: body.payload,
    },
  });
  return NextResponse.json(template, { status: 201 });
}
