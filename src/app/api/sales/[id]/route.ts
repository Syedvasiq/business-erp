import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournal } from "@/lib/journal";
import { VAT_RATE } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: { include: { item: true } },
      commissions: { include: { agent: true } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: { commissions: { include: { agent: true } } },
  });

  if (invoice.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot modify a cancelled invoice" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedInvoice = await tx.invoice.update({
      where: { id },
      data: { status: body.status },
    });

    // ── When invoice is marked PAID, post commission journal entries ──────────
    // The commission record was created at invoice time but the expense is only
    // recognised and the liability recorded when payment is confirmed.
    if (body.status === "PAID") {
      const unpaidCommissions = invoice.commissions.filter((c) => !c.isPaid);

      for (const comm of unpaidCommissions) {
        const commAmount = Number(comm.totalPayout) - Number(comm.vatOnComm);
        const vatOnComm  = Number(comm.vatOnComm);
        const total      = Number(comm.totalPayout);

        // DR Commission Expense + Input VAT (if external) / CR Commission Payable
        await postJournal(
          `COMM-${comm.id.slice(0, 8)}`,
          `Commission for invoice ${invoice.number} — agent ${comm.agent.name}`,
          new Date(),
          [
            { accountCode: "5100", type: "DEBIT",  amount: commAmount },
            ...(vatOnComm > 0
              ? [{ accountCode: "1200", type: "DEBIT"  as const, amount: vatOnComm }]
              : []),
            { accountCode: "2300", type: "CREDIT", amount: total },
          ]
        );

        // Also update the commission record with the journal reference
        await tx.commission.update({
          where: { id: comm.id },
          data: { journalRef: `COMM-${comm.id.slice(0, 8)}` },
        });
      }

      // DR Accounts Receivable → CR Cash (payment received)
      await postJournal(
        `PAY-${invoice.number}`,
        `Payment received for invoice ${invoice.number}`,
        new Date(),
        [
          { accountCode: "1000", type: "DEBIT",  amount: Number(invoice.totalAed) },
          { accountCode: "1100", type: "CREDIT", amount: Number(invoice.totalAed) },
        ]
      );
    }

    return updatedInvoice;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: { lines: true, commissions: true },
  });

  if (invoice.status === "CANCELLED") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // Restore stock
    for (const line of invoice.lines) {
      await tx.item.update({
        where: { id: line.itemId },
        data: { stockQty: { increment: Number(line.qty) } },
      });
    }

    // Cancel any unpaid commissions on this invoice
    await tx.commission.deleteMany({
      where: { invoiceId: id, isPaid: false },
    });

    await tx.invoice.update({ where: { id }, data: { status: "CANCELLED" } });

    const cogsTotal = invoice.lines.reduce((s, l) => s + Number(l.cogsCost), 0);
    await postJournal(
      `REV-${invoice.number}`,
      `Reversal of ${invoice.number}`,
      new Date(),
      [
        { accountCode: "4000", type: "DEBIT",  amount: Number(invoice.subtotalAed) },
        { accountCode: "2100", type: "DEBIT",  amount: Number(invoice.vatAmount) },
        { accountCode: "1100", type: "CREDIT", amount: Number(invoice.totalAed) },
        { accountCode: "1300", type: "DEBIT",  amount: cogsTotal },
        { accountCode: "5000", type: "CREDIT", amount: cogsTotal },
      ]
    );
  });

  return NextResponse.json({ success: true });
}
