import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const agents = await prisma.agent.findMany({
    include: { commissions: { select: { totalPayout: true, isPaid: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(agents);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const agent = await prisma.agent.create({ data: body });
  return NextResponse.json(agent, { status: 201 });
}
