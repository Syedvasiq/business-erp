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

  if (report === "pl")     return getPL(from, to);
  if (report === "vat201") return getVAT201(from, to);
  if (report === "ct")     return getCorporateTax(from, to);

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}

async function getPL(from: Date, to: Date) {
  // ── Revenue: subtotal of all non-cancelled invoices in period ──────────────
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELLED" }, issueDate: { gte: from, lte: to } },
    include: { lines: true },
  });

  const revenue = invoices.reduce((s, inv) => s + Number(inv.subtotalAed), 0);

  // ── COGS: weighted-average cost of items sold (from invoice lines) ─────────
  const cogs = invoices
    .flatMap((inv) => inv.lines)
    .reduce((s, l) => s + Number(l.cogsCost), 0);

  const grossProfit = revenue - cogs;

  // ── Purchase costs (total supplier spend in period, excl. VAT) ────────────
  const purchaseAgg = await prisma.purchaseOrder.aggregate({
    where: { status: "RECEIVED", orderDate: { gte: from, lte: to } },
    _sum: { subtotalAed: true, inputVat: true, customsDuty: true, shippingCost: true },
  });
  const totalPurchaseCost =
    Number(purchaseAgg._sum.subtotalAed ?? 0) +
    Number(purchaseAgg._sum.inputVat    ?? 0) +
    Number(purchaseAgg._sum.customsDuty ?? 0) +
    Number(purchaseAgg._sum.shippingCost ?? 0);

  // ── Expenses: from the Expense table ──────────────────────────────────────
  const expenseRows = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
  });
  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const e of expenseRows) {
    const amt = Number(e.amount);
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + amt;
    totalExpenses += amt;
  }

  // ── Commission expense: paid commissions in period ─────────────────────────
  const commAgg = await prisma.commission.aggregate({
    where: { isPaid: true, createdAt: { gte: from, lte: to } },
    _sum: { totalPayout: true },
  });
  const commissionExpense = Number(commAgg._sum.totalPayout ?? 0);

  // ── Net profit ─────────────────────────────────────────────────────────────
  // Gross Profit − Operating Expenses − Commissions
  const operatingExpenses = totalExpenses + commissionExpense;
  const netProfit = grossProfit - operatingExpenses;

  return NextResponse.json({
    revenue,
    cogs,
    grossProfit,
    totalPurchaseCost,
    expenses: {
      breakdown: expensesByCategory,
      total: totalExpenses,
    },
    commissionExpense,
    operatingExpenses,
    netProfit,
    from,
    to,
  });
}

async function getVAT201(from: Date, to: Date) {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELLED" }, issueDate: { gte: from, lte: to } },
    include: { lines: true },
  });

  const outputByEmirate: Record<string, { taxable: number; vat: number }> = {};
  for (const inv of invoices) {
    const emirate = inv.emirate ?? "Dubai";
    if (!outputByEmirate[emirate]) outputByEmirate[emirate] = { taxable: 0, vat: 0 };
    outputByEmirate[emirate].taxable += Number(inv.subtotalAed);
    outputByEmirate[emirate].vat     += Number(inv.vatAmount);
  }

  const inputVat = await prisma.purchaseOrder.aggregate({
    where: { status: "RECEIVED", orderDate: { gte: from, lte: to } },
    _sum: { inputVat: true },
  });

  const totalOutputVat = invoices.reduce((s, inv) => s + Number(inv.vatAmount), 0);
  const totalInputVat  = Number(inputVat._sum.inputVat ?? 0);
  const netVatPayable  = totalOutputVat - totalInputVat;

  return NextResponse.json({
    outputByEmirate,
    totalOutputVat,
    totalInputVat,
    netVatPayable,
    from,
    to,
  });
}

async function getCorporateTax(from: Date, to: Date) {
  const plRes = await getPL(from, to);
  const pl    = await plRes.json();
  const netProfit = pl.netProfit as number;

  const taxableIncome = Math.max(0, netProfit - CT_FREE_THRESHOLD);
  const ctPayable     = taxableIncome * CT_RATE;
  const eligibleForSBR = netProfit <= SBR_THRESHOLD;

  return NextResponse.json({
    netProfit,
    taxableIncome,
    ctPayable: eligibleForSBR ? 0 : ctPayable,
    eligibleForSBR,
    CT_FREE_THRESHOLD,
    CT_RATE,
    SBR_THRESHOLD,
    from,
    to,
  });
}
