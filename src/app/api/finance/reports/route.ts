import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CT_FREE_THRESHOLD, CT_RATE, SBR_THRESHOLD } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const report = searchParams.get("report");
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")! + "T00:00:00")
    : new Date(new Date().getFullYear(), 0, 1);
  const to = searchParams.get("to")
    ? new Date(searchParams.get("to")! + "T23:59:59")
    : new Date();

  if (report === "trial-balance")  return getTrialBalance();
  if (report === "balance-sheet")  return getBalanceSheet();
  if (report === "cash-flow")      return getCashFlow(from, to);
  if (report === "pl")             return getPL(from, to);
  if (report === "vat201")         return getVAT201(from, to);
  if (report === "ct")             return getCorporateTax(from, to);
  if (report === "ledger") {
    const accountId = searchParams.get("accountId");
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
    return getLedger(accountId, from, to);
  }

  return NextResponse.json({ error: "Invalid report" }, { status: 400 });
}

async function getTrialBalance() {
  const accounts = await prisma.account.findMany({
    include: { journalLines: true },
    orderBy: { code: "asc" },
  });

  const rows = accounts.map((acc) => {
    const totalDr = acc.journalLines.filter((l) => l.type === "DEBIT").reduce((s, l) => s + Number(l.aedAmount), 0);
    const totalCr = acc.journalLines.filter((l) => l.type === "CREDIT").reduce((s, l) => s + Number(l.aedAmount), 0);
    const balance = totalDr - totalCr;
    return { code: acc.code, name: acc.name, type: acc.type, totalDr, totalCr, balance };
  }).filter((r) => r.totalDr > 0 || r.totalCr > 0);

  const grandDr = rows.reduce((s, r) => s + r.totalDr, 0);
  const grandCr = rows.reduce((s, r) => s + r.totalCr, 0);

  return NextResponse.json({ rows, grandDr, grandCr });
}

async function getBalanceSheet() {
  const accounts = await prisma.account.findMany({
    include: { journalLines: true },
    orderBy: { code: "asc" },
  });

  const getBalance = (acc: typeof accounts[0]) => {
    const dr = acc.journalLines.filter((l) => l.type === "DEBIT").reduce((s, l) => s + Number(l.aedAmount), 0);
    const cr = acc.journalLines.filter((l) => l.type === "CREDIT").reduce((s, l) => s + Number(l.aedAmount), 0);
    // Assets/Expenses: DR increases; Liabilities/Equity/Revenue: CR increases
    if (acc.type === "ASSET" || acc.type === "EXPENSE") return dr - cr;
    return cr - dr;
  };

  const assets      = accounts.filter((a) => a.type === "ASSET");
  const liabilities = accounts.filter((a) => a.type === "LIABILITY");
  const equity      = accounts.filter((a) => a.type === "EQUITY");
  const revenue     = accounts.filter((a) => a.type === "REVENUE");
  const expenses    = accounts.filter((a) => a.type === "EXPENSE");

  const totalRevenue  = revenue.reduce((s, a) => s + getBalance(a), 0);
  const totalExpenses = expenses.reduce((s, a) => s + getBalance(a), 0);
  const retainedEarnings = totalRevenue - totalExpenses;

  const assetRows      = assets.map((a) => ({ code: a.code, name: a.name, balance: getBalance(a) }));
  const liabilityRows  = liabilities.map((a) => ({ code: a.code, name: a.name, balance: getBalance(a) }));
  const equityRows     = equity.filter((a) => a.code !== "3100").map((a) => ({ code: a.code, name: a.name, balance: getBalance(a) }));

  const totalAssets      = assetRows.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilityRows.reduce((s, r) => s + r.balance, 0);
  const totalEquity      = equityRows.reduce((s, r) => s + r.balance, 0) + retainedEarnings;

  return NextResponse.json({
    assets: assetRows, totalAssets,
    liabilities: liabilityRows, totalLiabilities,
    equity: equityRows, retainedEarnings, totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
  });
}

async function getCashFlow(from: Date, to: Date) {
  const payments = await prisma.payment.findMany({
    where: { date: { gte: from, lte: to } },
    include: { invoice: true, purchaseOrder: true },
  });

  const operating = {
    receiptsFromCustomers: payments.filter((p) => p.invoiceId).reduce((s, p) => s + Number(p.amount), 0),
    paymentsToSuppliers:   payments.filter((p) => p.purchaseOrderId).reduce((s, p) => s + Number(p.amount), 0),
  };

  const expenses = await prisma.expense.findMany({ where: { date: { gte: from, lte: to } } });
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const netOperating = operating.receiptsFromCustomers - operating.paymentsToSuppliers - totalExpenses;

  return NextResponse.json({
    operating: { ...operating, expenses: totalExpenses, net: netOperating },
    investing: { net: 0 },
    financing: { net: 0 },
    netCashFlow: netOperating,
    from, to,
  });
}

async function getPL(from: Date, to: Date) {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELLED" }, issueDate: { gte: from, lte: to } },
    include: { lines: true },
  });
  const revenue = invoices.reduce((s, i) => s + Number(i.subtotalAed), 0);
  const cogs    = invoices.flatMap((i) => i.lines).reduce((s, l) => s + Number(l.cogsCost), 0);
  const grossProfit = revenue - cogs;

  const expenseRows = await prisma.expense.findMany({ where: { date: { gte: from, lte: to } } });
  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const e of expenseRows) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + Number(e.amount);
    totalExpenses += Number(e.amount);
  }

  const commAgg = await prisma.commission.aggregate({
    where: { isPaid: true, createdAt: { gte: from, lte: to } },
    _sum: { totalPayout: true },
  });
  const commissionExpense = Number(commAgg._sum.totalPayout ?? 0);
  const operatingExpenses = totalExpenses + commissionExpense;
  const netProfit = grossProfit - operatingExpenses;

  return NextResponse.json({ revenue, cogs, grossProfit, expenses: { breakdown: expensesByCategory, total: totalExpenses }, commissionExpense, operatingExpenses, netProfit, from, to });
}

async function getVAT201(from: Date, to: Date) {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELLED" }, issueDate: { gte: from, lte: to } },
  });
  const outputByEmirate: Record<string, { taxable: number; vat: number }> = {};
  for (const inv of invoices) {
    const e = inv.emirate ?? "Dubai";
    if (!outputByEmirate[e]) outputByEmirate[e] = { taxable: 0, vat: 0 };
    outputByEmirate[e].taxable += Number(inv.subtotalAed);
    outputByEmirate[e].vat     += Number(inv.vatAmount);
  }
  const totalOutputVat = invoices.reduce((s, i) => s + Number(i.vatAmount), 0);
  const inputAgg = await prisma.purchaseOrder.aggregate({
    where: { status: { not: "CANCELLED" }, orderDate: { gte: from, lte: to } },
    _sum: { inputVat: true },
  });
  const totalInputVat = Number(inputAgg._sum.inputVat ?? 0);
  return NextResponse.json({ outputByEmirate, totalOutputVat, totalInputVat, netVatPayable: totalOutputVat - totalInputVat, from, to });
}

async function getCorporateTax(from: Date, to: Date) {
  const plRes  = await getPL(from, to);
  const pl     = await plRes.json();
  const netProfit     = pl.netProfit as number;
  const taxableIncome = Math.max(0, netProfit - CT_FREE_THRESHOLD);
  const ctPayable     = taxableIncome * CT_RATE;
  const eligibleForSBR = netProfit <= SBR_THRESHOLD;
  return NextResponse.json({ netProfit, taxableIncome, ctPayable: eligibleForSBR ? 0 : ctPayable, eligibleForSBR, CT_FREE_THRESHOLD, CT_RATE, SBR_THRESHOLD, from, to });
}

async function getLedger(accountId: string, from: Date, to: Date) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Opening balance = all lines BEFORE the from date
  const openingLines = await prisma.journalLine.findMany({
    where: { accountId, journal: { date: { lt: from } } },
    select: { type: true, aedAmount: true },
  });

  const normalDebit = account.type === "ASSET" || account.type === "EXPENSE";
  const openingBalance = openingLines.reduce((sum, l) => {
    const amt = Number(l.aedAmount);
    return sum + (normalDebit ? (l.type === "DEBIT" ? amt : -amt) : (l.type === "CREDIT" ? amt : -amt));
  }, 0);

  // Lines within the date range
  const lines = await prisma.journalLine.findMany({
    where: { accountId, journal: { date: { gte: from, lte: to } } },
    include: {
      journal: { select: { id: true, reference: true, description: true, date: true } },
    },
    orderBy: { journal: { date: "asc" } },
  });

  // Build rows with running balance
  let running = openingBalance;
  const rows = lines.map((l) => {
    const amt = Number(l.aedAmount);
    const debit  = l.type === "DEBIT"  ? amt : 0;
    const credit = l.type === "CREDIT" ? amt : 0;
    if (normalDebit) running += debit - credit;
    else             running += credit - debit;
    return {
      date:        l.journal.date,
      reference:   l.journal.reference,
      description: l.journal.description,
      debit:       debit  > 0 ? debit  : null,
      credit:      credit > 0 ? credit : null,
      balance:     running,
    };
  });

  const closingBalance = running;
  const totalDebit  = rows.reduce((s, r) => s + (r.debit  ?? 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);

  return NextResponse.json({
    account: { id: account.id, code: account.code, name: account.name, type: account.type },
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    rows,
    from,
    to,
  });
}
