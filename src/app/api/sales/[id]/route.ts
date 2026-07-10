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

  const { updatedInvoice, journals } = await prisma.$transaction(async (tx) => {
    const updatedInvoice = await tx.invoice.update({
      where: { id },
      data: { status: body.status },
    });

    const journals: { ref: string; desc: string; date: Date; lines: any[] }[] = [];

    if (body.status === "PAID" || body.status === "PARTIALLY_PAID") {
      const unpaidCommissions = invoice.commissions.filter((c) => !c.isPaid);

      if (body.status === "PAID") {
        for (const comm of unpaidCommissions) {
          const commAmount = Number(comm.totalPayout) - Number(comm.vatOnComm);
          const vatOnComm  = Number(comm.vatOnComm);
          const total      = Number(comm.totalPayout);
          const commRef    = `COMM-${comm.id.slice(0, 8)}`;
          journals.push({
            ref: commRef,
            desc: `Commission for invoice ${invoice.number} — agent ${comm.agent.name}`,
            date: new Date(),
            lines: [
              { accountCode: "5100", type: "DEBIT",  amount: commAmount },
              ...(vatOnComm > 0 ? [{ accountCode: "1200", type: "DEBIT" as const, amount: vatOnComm }] : []),
              { accountCode: "2300", type: "CREDIT", amount: total },
            ],
          });
          await tx.commission.update({
            where: { id: comm.id },
            data: { journalRef: commRef },
          });
        }
      }

      const paymentAmount = body.payment?.amount ?? Number(invoice.totalAed);
      const journalRef = `PAY-${invoice.number}-${Date.now()}`;

      await tx.payment.create({
        data: {
          invoiceId: id,
          method: body.payment?.method ?? "CASH",
          amount: paymentAmount,
          date: body.payment?.date ? new Date(body.payment.date) : new Date(),
          bankName:      body.payment?.bankName      || null,
          transactionId: body.payment?.transactionId || null,
          chequeNumber:  body.payment?.chequeNumber  || null,
          chequeDate:    body.payment?.chequeDate ? new Date(body.payment.chequeDate) : null,
          chequeBank:    body.payment?.chequeBank    || null,
          notes:         body.payment?.notes         || null,
          journalRef,
        },
      });

      journals.push({
        ref: journalRef,
        desc: `Payment received for ${invoice.number} via ${body.payment?.method ?? "CASH"}`,
        date: body.payment?.date ? new Date(body.payment.date) : new Date(),
        lines: [
          { accountCode: "1000", type: "DEBIT",  amount: paymentAmount },
          { accountCode: "1100", type: "CREDIT", amount: paymentAmount },
        ],
      });
    }

    return { updatedInvoice, journals };
  });

  for (const j of journals) {
    await postJournal(j.ref, j.desc, j.date, j.lines);
  }

  const updated = updatedInvoice;

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

  const cogsTotal = invoice.lines.reduce((s, l) => s + Number(l.cogsCost), 0);

  await prisma.$transaction(async (tx) => {
    for (const line of invoice.lines) {
      await tx.item.update({
        where: { id: line.itemId },
        data: { stockQty: { increment: Number(line.qty) } },
      });
    }
    await tx.commission.deleteMany({ where: { invoiceId: id, isPaid: false } });
    await tx.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  });

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

  return NextResponse.json({ success: true });
}
