import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ML = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Parse date strings as local time (append T00:00:00 avoids UTC shift)
  const fromStr = searchParams.get("from") ?? (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`; })();
  const toStr   = searchParams.get("to")   ?? (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(new Date(n.getFullYear(),n.getMonth()+1,0).getDate()).padStart(2,"0")}`; })();

  const from = new Date(fromStr + "T00:00:00");
  const to   = new Date(toStr   + "T23:59:59");

  // Extract year and 0-based month directly from the string to avoid any TZ issues
  const fromY  = parseInt(fromStr.slice(0, 4));
  const fromM  = parseInt(fromStr.slice(5, 7)) - 1; // 0-based
  const toY    = parseInt(toStr.slice(0, 4));
  const toM    = parseInt(toStr.slice(5, 7)) - 1;   // 0-based

  const totalMonths   = (toY - fromY) * 12 + (toM - fromM) + 1;
  const totalYears    = toY - fromY + 1;
  const isSingleMonth = totalMonths === 1;
  const isMultiYear   = totalYears > 1;

  const [
    outstandingInvoices, outstandingPOs, periodPayments,
    bankAccounts, customers, suppliers,
    periodExpenses, allPayments, periodInvoices,
  ] = await Promise.all([
    prisma.invoice.findMany({ where: { status: { in: ["ISSUED","PARTIALLY_PAID"] } }, include: { payments: true } }),
    prisma.purchaseOrder.findMany({ where: { status: { in: ["RECEIVED","PARTIALLY_PAID"] } }, include: { payments: true } }),
    prisma.payment.findMany({ where: { date: { gte: from, lte: to } } }),
    prisma.bankAccount.findMany({ where: { isActive: true }, include: { transactions: true } }),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.expense.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
    prisma.payment.findMany({ where: { date: { gte: from, lte: to } }, select: { method: true, amount: true } }),
    prisma.invoice.findMany({ where: { status: { not: "CANCELLED" }, issueDate: { gte: from, lte: to } } }),
  ]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const today = new Date();
  const totalAR = outstandingInvoices.reduce((s, i) => s + Math.max(0, Number(i.totalAed) - i.payments.reduce((ps, p) => ps + Number(p.amount), 0)), 0);
  const totalAP = outstandingPOs.reduce((s, po) => s + Math.max(0, Number(po.totalAed) - po.payments.reduce((ps, p) => ps + Number(p.amount), 0)), 0);
  const totalBankBalance = bankAccounts.reduce((s, a) => {
    const cr = a.transactions.filter(t => t.type === "CREDIT").reduce((sum, t) => sum + Number(t.amount), 0);
    const dr = a.transactions.filter(t => t.type === "DEBIT").reduce((sum, t) => sum + Number(t.amount), 0);
    return s + Number(a.openingBalance) + cr - dr;
  }, 0);
  const overdueCount   = outstandingInvoices.filter(i => Math.floor((today.getTime() - new Date(i.issueDate).getTime()) / 86400000) > 30).length;
  const periodReceipts = periodPayments.filter(p => p.invoiceId).reduce((s, p) => s + Number(p.amount), 0);
  const periodPaid     = periodPayments.filter(p => p.purchaseOrderId).reduce((s, p) => s + Number(p.amount), 0);

  // ── Bar chart data ────────────────────────────────────────────────────────
  let monthlyData: { month: string; revenue: number; expenses: number }[] = [];

  if (isSingleMonth) {
    // Daily — fromY and fromM (0-based) are correct here
    const daysInMonth = new Date(fromY, fromM + 1, 0).getDate();
    monthlyData = Array.from({ length: daysInMonth }, (_, i) => {
      const day     = i + 1;
      const dayFrom = new Date(fromY, fromM, day, 0, 0, 0);
      const dayTo   = new Date(fromY, fromM, day, 23, 59, 59);
      return {
        month:    String(day),
        revenue:  periodInvoices.filter(inv => { const d = new Date(inv.issueDate); return d >= dayFrom && d <= dayTo; }).reduce((s, inv) => s + Number(inv.subtotalAed), 0),
        expenses: periodExpenses.filter(e   => { const d = new Date(e.date);        return d >= dayFrom && d <= dayTo; }).reduce((s, e)   => s + Number(e.amount), 0),
      };
    });
  } else if (isMultiYear && totalYears > 2) {
    // Year granularity
    monthlyData = Array.from({ length: totalYears }, (_, i) => {
      const yr = fromY + i;
      return {
        month:    String(yr),
        revenue:  periodInvoices.filter(inv => new Date(inv.issueDate).getFullYear() === yr).reduce((s, inv) => s + Number(inv.subtotalAed), 0),
        expenses: periodExpenses.filter(e   => new Date(e.date).getFullYear() === yr).reduce((s, e) => s + Number(e.amount), 0),
      };
    });
  } else {
    // Monthly (single year or 2-year span)
    const months: { y: number; m: number; label: string }[] = [];
    const cursor = new Date(fromY, fromM, 1);
    const end    = new Date(toY, toM, 1);
    while (cursor <= end) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      months.push({ y, m, label: isMultiYear ? `${ML[m]} ${y}` : ML[m] });
      cursor.setMonth(m + 1);
    }
    monthlyData = months.map(({ y, m, label }) => ({
      month:    label,
      revenue:  periodInvoices.filter(inv => new Date(inv.issueDate).getFullYear() === y && new Date(inv.issueDate).getMonth() === m).reduce((s, inv) => s + Number(inv.subtotalAed), 0),
      expenses: periodExpenses.filter(e   => new Date(e.date).getFullYear() === y && new Date(e.date).getMonth() === m).reduce((s, e) => s + Number(e.amount), 0),
    }));
  }

  // ── Expense by category ───────────────────────────────────────────────────
  const catMap: Record<string, number> = {};
  for (const e of periodExpenses) { const l = e.category.replace(/_/g," "); catMap[l] = (catMap[l]??0) + Number(e.amount); }
  const expenseByCategory = Object.entries(catMap).map(([name,value]) => ({name,value})).sort((a,b) => b.value-a.value);

  // ── AR aging ──────────────────────────────────────────────────────────────
  const aging = { b1_30:0, b31_60:0, b61_90:0, over90:0 };
  for (const inv of outstandingInvoices) {
    const bal  = Math.max(0, Number(inv.totalAed) - inv.payments.reduce((s,p) => s+Number(p.amount),0));
    const days = Math.floor((today.getTime() - new Date(inv.issueDate).getTime()) / 86400000);
    if      (days <= 30) aging.b1_30  += bal;
    else if (days <= 60) aging.b31_60 += bal;
    else if (days <= 90) aging.b61_90 += bal;
    else                 aging.over90 += bal;
  }
  const agingData = [
    { bucket:"1–30 Days",  amount:aging.b1_30  },
    { bucket:"31–60 Days", amount:aging.b31_60 },
    { bucket:"61–90 Days", amount:aging.b61_90 },
    { bucket:"Over 90",    amount:aging.over90  },
  ];

  // ── Payment method ────────────────────────────────────────────────────────
  const methodMap: Record<string, number> = {};
  for (const p of allPayments) { const l = p.method.replace(/_/g," "); methodMap[l] = (methodMap[l]??0) + Number(p.amount); }
  const paymentByMethod = Object.entries(methodMap).map(([name,value]) => ({name,value})).sort((a,b) => b.value-a.value);

  return NextResponse.json({
    totalAR, totalAP, totalBankBalance, overdueCount,
    periodReceipts, periodPaid,
    outstandingInvoicesCount: outstandingInvoices.length,
    outstandingPOsCount: outstandingPOs.length,
    bankAccountsCount: bankAccounts.length,
    customers, suppliers,
    monthlyData, expenseByCategory, agingData, paymentByMethod,
    isSingleMonth,
  });
}
