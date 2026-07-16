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
      payments: true,
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

  if (body.edit) {
    try {
      const { vatRate: vatRatePct } = await (await import("@/lib/settings")).getSettings();
      const VAT_RATE = vatRatePct / 100;

      const fullInvoice = await prisma.invoice.findUniqueOrThrow({
        where: { id },
        include: { lines: true },
      });

      // 1. Restore stock for old lines
      for (const line of fullInvoice.lines) {
        await prisma.item.update({
          where: { id: line.itemId },
          data: { stockQty: { increment: Number(line.qty) } },
        });
      }

      // 2. Delete old lines
      await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });

      // 3. Recalculate new lines
      let subtotal = 0, vatTotal = 0;
      const lineData: any[] = [];

      for (const line of body.lines) {
        const item = await prisma.item.findUniqueOrThrow({ where: { id: line.itemId } });
        const gross = Number(line.qty) * Number(line.unitPrice);
        const discountAmt = gross * (Number(line.discountPct || 0) / 100);
        const lineSubtotal = gross - discountAmt;
        const vat = item.taxType === "STANDARD" ? lineSubtotal * VAT_RATE : 0;
        const cogsCost = Number(item.weightedAvgCost) * Number(line.qty);
        subtotal += lineSubtotal;
        vatTotal += vat;

        if (Number(item.stockQty) < Number(line.qty)) {
          throw new Error(`Insufficient stock for "${item.name}". Available: ${Number(item.stockQty)}`);
        }
        await prisma.item.update({
          where: { id: item.id },
          data: { stockQty: { decrement: Number(line.qty) } },
        });

        lineData.push({
          invoiceId: id,
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

      // 4. Create new lines
      await prisma.invoiceLine.createMany({ data: lineData });

      // 5. Update invoice header
      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          customerId: body.customerId,
          currency: body.currency,
          exchangeRate: body.exchangeRate,
          emirate: body.emirate,
          isSimplified: body.isSimplified,
          issueDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          subtotalAed: subtotal,
          vatAmount: vatTotal,
          totalAed,
        },
      });

      // 6. Reverse old journal, post new one
      const cogsTotal = lineData.reduce((s, l) => s + l.cogsCost, 0);
      const uid = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      await postJournal(
        `REV-${fullInvoice.number}-${uid}`,
        `Edit reversal of ${fullInvoice.number}`,
        new Date(),
        [
          { accountCode: "4000", type: "DEBIT",  amount: Number(fullInvoice.subtotalAed) },
          { accountCode: "2100", type: "DEBIT",  amount: Number(fullInvoice.vatAmount) },
          { accountCode: "1100", type: "CREDIT", amount: Number(fullInvoice.totalAed) },
          { accountCode: "1300", type: "DEBIT",  amount: fullInvoice.lines.reduce((s, l) => s + Number(l.cogsCost), 0) },
          { accountCode: "5000", type: "CREDIT", amount: fullInvoice.lines.reduce((s, l) => s + Number(l.cogsCost), 0) },
        ]
      );
      await postJournal(
        `${fullInvoice.number}-E${uid}`,
        `Edited sale - ${fullInvoice.number}`,
        body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
        [
          { accountCode: "1100", type: "DEBIT",  amount: totalAed },
          { accountCode: "4000", type: "CREDIT", amount: subtotal },
          { accountCode: "2100", type: "CREDIT", amount: vatTotal },
          { accountCode: "5000", type: "DEBIT",  amount: cogsTotal },
          { accountCode: "1300", type: "CREDIT", amount: cogsTotal },
        ]
      );

      return NextResponse.json(updated);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  // Status / payment update — sequential queries, no transaction (avoids Neon timeout)
  const updatedInvoice = await prisma.invoice.update({
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
        const commRef    = `COMM-${comm.id.slice(0, 8)}-${crypto.randomUUID().slice(0, 6)}`;
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
        await prisma.commission.update({
          where: { id: comm.id },
          data: { journalRef: commRef },
        });
      }
    }

    const paymentAmount = body.payment?.amount ?? Number(invoice.totalAed);
    const journalRef = `PAY-${invoice.number}-${crypto.randomUUID().slice(0, 8)}`;

    await prisma.payment.create({
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

    // If bank transfer, credit the matching bank account balance
    if (body.payment?.method === "BANK_TRANSFER" && body.payment?.bankName) {
      const bankAcc = await prisma.bankAccount.findFirst({
        where: { name: body.payment.bankName },
      });
      if (bankAcc) {
        await prisma.bankTransaction.create({
          data: {
            bankAccountId: bankAcc.id,
            date: body.payment?.date ? new Date(body.payment.date) : new Date(),
            description: `Payment received — Invoice ${invoice.number}`,
            amount: paymentAmount,
            type: "CREDIT",
            reference: journalRef,
          },
        });
      }
    }

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

  // Restore stock
  for (const line of invoice.lines)
    await prisma.item.update({ where: { id: line.itemId }, data: { stockQty: { increment: Number(line.qty) } } });

  await prisma.commission.deleteMany({ where: { invoiceId: id, isPaid: false } });
  await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } });

  // Post reversal journal — if it fails, invoice is already cancelled (acceptable; journal can be posted manually)
  const revRef = `REV-${invoice.number}`;
  const existingRev = await prisma.journal.findUnique({ where: { reference: revRef } });
  if (!existingRev) {
    await postJournal(
      revRef,
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
  }

  return NextResponse.json({ success: true });
}
