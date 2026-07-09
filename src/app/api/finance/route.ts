import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now   = new Date();
  const from  = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to    = searchParams.get("to")
    ? new Date(searchParams.get("to")!)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    invoices,
    purchases,
    expenses,
    partners,
  ] = await Promise.all([
    // Paid invoices only — revenue is realised on payment
    prisma.invoice.findMany({
      where: { status: "PAID", issueDate: { gte: from, lte: to } },
      include: { lines: true },
    }),
    // Received purchase orders — cost is recognised on receipt
    prisma.purchaseOrder.findMany({
      where: { status: "RECEIVED", orderDate: { gte: from, lte: to } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
    }),
    prisma.partner.findMany({
      include: {
        withdrawals: {
          where: { date: { gte: from, lte: to } },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Revenue ──
  const totalSales   = invoices.reduce((s, i) => s + Number(i.subtotalAed), 0);
  const totalVatOut  = invoices.reduce((s, i) => s + Number(i.vatAmount), 0);

  // ── Cost of Goods Sold (from invoice COGS lines) ──
  const totalCogs    = invoices
    .flatMap((i) => i.lines)
    .reduce((s, l) => s + Number(l.cogsCost), 0);

  // ── Purchases (cost of stock received, ex-VAT) ──
  const totalPurchases = purchases.reduce((s, p) => s + Number(p.subtotalAed), 0);
  const totalVatIn     = purchases.reduce((s, p) => s + Number(p.inputVat), 0);

  // ── Gross Profit = Sales (ex-VAT) − COGS ──
  const grossProfit  = totalSales - totalCogs;

  // ── Expenses ──
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // ── Net Profit = Gross Profit − Expenses ──
  const netProfit    = grossProfit - totalExpenses;

  // ── Partner share breakdown ──
  const partnerShares = partners.map((p) => {
    const share      = (netProfit * Number(p.sharePercent)) / 100;
    const withdrawn  = p.withdrawals.reduce((s, w) => s + Number(w.amount), 0);
    const balance    = share - withdrawn;
    return {
      id:           p.id,
      name:         p.name,
      sharePercent: Number(p.sharePercent),
      shareAmount:  share,
      withdrawn,
      balance,
      withdrawals:  p.withdrawals,
    };
  });

  // ── Expense breakdown by category ──
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + Number(e.amount);
  }

  return NextResponse.json({
    period: { from, to },
    totalSales,
    totalVatOut,
    totalPurchases,
    totalVatIn,
    totalCogs,
    grossProfit,
    totalExpenses,
    netProfit,
    expenseByCategory,
    partnerShares,
    invoiceCount:  invoices.length,
    purchaseCount: purchases.length,
    expenseCount:  expenses.length,
  });
}
