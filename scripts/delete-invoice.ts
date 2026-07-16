import * as dotenv from "dotenv";
import * as path from "path";

// Load .env BEFORE prisma client is created
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter, log: ["error"] });

const INVOICE_NUMBER = "INV-000033";

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { number: INVOICE_NUMBER },
    include: { payments: true, lines: true, commissions: true, creditNotes: true },
  });

  if (!invoice) {
    console.log(`❌ Invoice ${INVOICE_NUMBER} not found.`);
    return;
  }

  console.log(`\n📄 Found: ${invoice.number} (id: ${invoice.id})`);
  console.log(`   Status:       ${invoice.status}`);
  console.log(`   Journal Ref:  ${invoice.journalRef ?? "none"}`);
  console.log(`   Payments:     ${invoice.payments.length}`);
  console.log(`   Lines:        ${invoice.lines.length}`);
  console.log(`   Commissions:  ${invoice.commissions.length}`);
  console.log(`   Credit Notes: ${invoice.creditNotes.length}`);

  // Collect all journal refs to delete
  const journalRefs = new Set<string>();
  if (invoice.journalRef) journalRefs.add(invoice.journalRef);
  invoice.payments.forEach((p) => { if (p.journalRef) journalRefs.add(p.journalRef); });
  invoice.commissions.forEach((c) => { if (c.journalRef) journalRefs.add(c.journalRef); });
  invoice.creditNotes.forEach((cn) => { if (cn.journalRef) journalRefs.add(cn.journalRef); });

  // REV- journal
  const revJournal = await prisma.journal.findUnique({ where: { reference: `REV-${INVOICE_NUMBER}` } });
  if (revJournal) journalRefs.add(revJournal.reference);

  // Edit journals (INV-000033-E...)
  const editJournals = await prisma.journal.findMany({ where: { reference: { startsWith: `${INVOICE_NUMBER}-E` } } });
  editJournals.forEach((j) => journalRefs.add(j.reference));

  // Edit reversal journals (REV-INV-000033-...)
  const editRevJournals = await prisma.journal.findMany({ where: { reference: { startsWith: `REV-${INVOICE_NUMBER}-` } } });
  editRevJournals.forEach((j) => journalRefs.add(j.reference));

  console.log(`\n📒 Journal refs to delete: ${[...journalRefs].join(", ") || "none"}`);

  const paymentIds   = invoice.payments.map((p) => p.id);
  const paymentJRefs = invoice.payments.map((p) => p.journalRef).filter(Boolean) as string[];

  // Bank transactions linked by journalRef or paymentId
  const bankTxns = await prisma.bankTransaction.findMany({
    where: {
      OR: [
        ...(paymentJRefs.length ? [{ reference: { in: paymentJRefs } }] : []),
        ...(paymentIds.length   ? [{ paymentId: { in: paymentIds } }]   : []),
      ],
    },
  });
  console.log(`🏦 Bank transactions to delete: ${bankTxns.length}`);

  // ── DELETE in FK-safe order ──────────────────────────────────────────────

  // 1. Bank transactions
  if (bankTxns.length > 0) {
    await prisma.bankTransaction.deleteMany({ where: { id: { in: bankTxns.map((t) => t.id) } } });
    console.log(`✅ Deleted ${bankTxns.length} bank transaction(s)`);
  }

  // 2. Payments
  if (paymentIds.length > 0) {
    await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
    console.log(`✅ Deleted ${paymentIds.length} payment(s)`);
  }

  // 3. Commissions
  if (invoice.commissions.length > 0) {
    await prisma.commission.deleteMany({ where: { invoiceId: invoice.id } });
    console.log(`✅ Deleted ${invoice.commissions.length} commission(s)`);
  }

  // 4. Credit notes
  if (invoice.creditNotes.length > 0) {
    await prisma.creditNote.deleteMany({ where: { invoiceId: invoice.id } });
    console.log(`✅ Deleted ${invoice.creditNotes.length} credit note(s)`);
  }

  // 5. Invoice lines + restore stock
  for (const line of invoice.lines) {
    await prisma.item.update({
      where: { id: line.itemId },
      data:  { stockQty: { increment: Number(line.qty) } },
    });
  }
  await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
  console.log(`✅ Deleted ${invoice.lines.length} invoice line(s) and restored stock`);

  // 6. Invoice
  await prisma.invoice.delete({ where: { id: invoice.id } });
  console.log(`✅ Deleted invoice ${INVOICE_NUMBER}`);

  // 7. Journal lines + journals
  if (journalRefs.size > 0) {
    const journals   = await prisma.journal.findMany({ where: { reference: { in: [...journalRefs] } } });
    const journalIds = journals.map((j) => j.id);
    await prisma.journalLine.deleteMany({ where: { journalId: { in: journalIds } } });
    await prisma.journal.deleteMany({ where: { id: { in: journalIds } } });
    console.log(`✅ Deleted ${journalIds.length} journal(s) and their lines`);
  }

  console.log(`\n🎉 All records for ${INVOICE_NUMBER} permanently deleted.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
