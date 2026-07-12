import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { partnerId, amount, note, date } = await req.json();
  const withdrawal = await prisma.partnerWithdrawal.create({
    data: { partnerId, amount, note: note || null, date: date ? new Date(date) : new Date() },
  });
  return NextResponse.json(withdrawal, { status: 201 });
}
