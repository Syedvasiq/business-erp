import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";
import { generateDocNumber } from "@/lib/utils";
import { requireSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const invoices = await prisma.invoice.findMany({
    where: status ? { status: status as any } : {},
    include: { customer: true, lines: { include: { item: true } } },
    orderBy: { issueDate: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const sessionUser = await requireSession();
  const body = await req.json();

  try {
    const { vatRate: vatRatePct } = await getSettings();
    const VAT_RATE = vatRatePct / 100;
    const result = await prisma.$transaction(async (tx) => {
    // Sequential invoice number
    const count = await tx.invoice.count();
    const number = generateDocNumber("INV", count + 1);

    let subtotal = 0;
    let vatTotal = 0;
    const lineData = [];

    // Validate customer ownership
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: body.customerId } });
    if (customer.assignedUserId && customer.assignedUserId !== sessionUser.id) {
      if (!["SUPER_ADMIN", "ADMIN"].includes(sessionUser.role)) {
        throw new Error("This customer is assigned to another staff member.");
      }
    }

    for (const line of body.lines) {
      const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
      const gross = Number(line.qty) * Number(line.unitPrice);
      const discountAmt = gross * (Number(line.discountPct || 0) / 100);
      const lineSubtotal = gross - discountAmt;
      const vat = item.taxType === "STANDARD" ? lineSubtotal * VAT_RATE : 0;
      const cogsCost = Number(item.weightedAvgCost) * Number(line.qty);

      subtotal += lineSubtotal;
      vatTotal += vat;

      // SUPER_ADMIN / ADMIN: deduct directly from item stock, no allocation needed
      const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(sessionUser.role);

      if (isAdmin) {
        if (Number(item.stockQty) < Number(line.qty)) {
          throw new Error(`Insufficient stock for "${item.name}". Available: ${Number(item.stockQty)}`);
        }
        await tx.item.update({
          where: { id: item.id },
          data: { stockQty: { decrement: Number(line.qty) } },
        });
      } else {
        // Staff: deduct from their allocation
        const alloc = await tx.stockAllocation.findUnique({
          where: { itemId_userId: { itemId: item.id, userId: sessionUser.id } },
        });
        if (!alloc) throw new Error(`No stock allocated for item "${item.name}". Contact admin.`);
        const remaining = Number(alloc.allocatedQty) - Number(alloc.soldQty);
        if (remaining < Number(line.qty)) {
          throw new Error(`Insufficient stock for "${item.name}". Available: ${remaining}`);
        }
        await tx.stockAllocation.update({
          where: { itemId_userId: { itemId: item.id, userId: sessionUser.id } },
          data: { soldQty: { increment: Number(line.qty) } },
        });
      }

      lineData.push({
        itemId: item.id,
        qty: line.qty,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct || 0,
        discountAmt,
        taxType: item.taxType,
        vatAmount: vat,
        lineTotal: lineSubtotal + vat,
        cogsCost,
      });
    }

    const totalAed = (subtotal + vatTotal) * Number(body.exchangeRate ?? 1);

    const invoice = await tx.invoice.create({
      data: {
        number,
        customerId: body.customerId,
        status: "ISSUED",
        currency: body.currency ?? "AED",
        exchangeRate: body.exchangeRate ?? 1,
        subtotalAed: subtotal,
        vatAmount: vatTotal,
        totalAed,
        emirate: body.emirate,
        isSimplified: body.isSimplified ?? false,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedUserId: sessionUser.id,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    // Double-entry: DR Accounts Receivable / CR Sales Revenue + Output VAT + COGS
    const cogsTotal = lineData.reduce((s, l) => s + l.cogsCost, 0);
    await postJournal(
      invoice.number,
      `Sale to customer - ${invoice.number}`,
      new Date(),
      [
        { accountCode: "1100", type: "DEBIT",  amount: totalAed },
        { accountCode: "4000", type: "CREDIT", amount: subtotal },
        { accountCode: "2100", type: "CREDIT", amount: vatTotal },
        { accountCode: "5000", type: "DEBIT",  amount: cogsTotal },
        { accountCode: "1300", type: "CREDIT", amount: cogsTotal },
      ]
    );

    // ── Auto-create commission if an agent was selected ──────────────────────
    // Commission base is always subtotalAed (ex-VAT), regardless of agent basis.
    // Journal is NOT posted here — it posts only when the invoice is marked PAID.
    if (body.agentId) {
      const agent = await tx.agent.findUnique({ where: { id: body.agentId } });
      if (agent) {
        const commAmount = (subtotal * Number(agent.rate)) / 100;
        // External agents (non-staff) charge 5% VAT on their commission invoice
        const vatOnComm = !agent.isInternal ? commAmount * VAT_RATE : 0;
        const totalPayout = commAmount + vatOnComm;

        await tx.commission.create({
          data: {
            agentId: agent.id,
            invoiceId: invoice.id,
            baseAmount:  subtotal,       // always ex-VAT
            rate:        agent.rate,
            vatOnComm,
            totalPayout,
            isPaid:      false,          // becomes payable only when invoice is PAID
          },
        });
      }
    }

      return invoice;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
