import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VAT_RATE } from "@/lib/utils";

export async function GET() {
  const commissions = await prisma.commission.findMany({
    include: { agent: true, invoice: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(commissions);
}

/**
 * Manually assign a commission to an invoice.
 * Used only when an agent wasn't selected at invoice creation time.
 *
 * Rules:
 * - Base is always invoice subtotalAed (ex-VAT)
 * - Journal is NOT posted here — it posts when the invoice is marked PAID
 * - External agents get 5% VAT added to their commission payout
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const agent   = await prisma.agent.findUniqueOrThrow({ where: { id: body.agentId } });
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: body.invoiceId } });

  if (invoice.status === "CANCELLED") {
    throw new Error("Cannot assign a commission to a cancelled invoice");
  }

  const baseAmount  = Number(invoice.subtotalAed);
  const commAmount  = (baseAmount * Number(agent.rate)) / 100;
  const vatOnComm   = !agent.isInternal ? commAmount * VAT_RATE : 0;
  const totalPayout = commAmount + vatOnComm;

  const commission = await prisma.commission.create({
    data: { agentId: agent.id, invoiceId: invoice.id, baseAmount, rate: agent.rate, vatOnComm, totalPayout, isPaid: false },
  });

  return NextResponse.json(commission, { status: 201 });
}
