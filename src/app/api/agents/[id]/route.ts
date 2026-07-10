import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const agent = await prisma.agent.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email ?? null,
      trn: body.trn ?? null,
      isInternal: body.isInternal,
      rate: body.rate,
      basis: body.basis,
    },
  });
  return NextResponse.json(agent);
}
