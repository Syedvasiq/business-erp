import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { PLClient } from "./PLClient";
import Link from "next/link";
import {
  ShoppingCart, TrendingUp, Receipt, DollarSign,
  BookOpen, FileSpreadsheet, RefreshCw,
} from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function KPI({
  title, value, sub, icon, tone,
}: {
  title: string; value: string; sub?: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "rose" | "violet";
}) {
  const tones = {
    blue:    "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50 text-amber-700",
    rose:    "bg-rose-50 text-rose-700",
    violet:  "bg-violet-50 text-violet-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

export default async function AccountingPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const yearStart  = new Date(now.getFullYear(), 0, 1);

  const [purchasesAgg, salesAgg, expensesAgg, cogsAgg] = await Promise.all([
    // Purchases this month
    prisma.purchaseOrder.aggregate({
      where: { status: "RECEIVED", orderDate: { gte: monthStart, lte: monthEnd } },
      _sum: { subtotalAed: true },
    }),
    // Sales this month (non-cancelled)
    prisma.invoice.aggregate({
      where: { status: { not: "CANCELLED" }, issueDate: { gte: monthStart, lte: monthEnd } },
      _sum: { subtotalAed: true },
    }),
    // Expenses this month
    prisma.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    // COGS this month
    prisma.invoiceLine.aggregate({
      where: { invoice: { status: { not: "CANCELLED" }, issueDate: { gte: monthStart, lte: monthEnd } } },
      _sum: { cogsCost: true },
    }),
  ]);

  const totalPurchases = Number(purchasesAgg._sum.subtotalAed ?? 0);
  const totalSales     = Number(salesAgg._sum.subtotalAed ?? 0);
  const totalExpenses  = Number(expensesAgg._sum.amount ?? 0);
  const totalCogs      = Number(cogsAgg._sum.cogsCost ?? 0);
  const netProfit      = totalSales - totalCogs - totalExpenses;

  const monthLabel = now.toLocaleDateString("en-AE", { month: "long", year: "numeric" });

  // Live exchange rates (today's cached or fresh)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cachedRates = await prisma.exchangeRate.findMany({
    where: { date: { gte: today } },
    orderBy: { currency: "asc" },
  });
  const rates = Object.fromEntries(cachedRates.map((r) => [r.currency, Number(r.rate)]));

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">

        {/* Header */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Accounting</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Accounts Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Overview for {monthLabel} · P&amp;L · VAT · Corporate Tax</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/accounting/expenses"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Receipt size={15} /> Expenses
              </Link>
              <Link href="/accounting/ledger"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                <BookOpen size={15} /> Ledger Book
              </Link>
            </div>
          </div>
        </Card>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPI title="Purchases this month"  value={formatAED(totalPurchases)} sub={monthLabel} icon={<ShoppingCart size={20} />} tone="amber" />
          <KPI title="Sales this month"      value={formatAED(totalSales)}     sub={monthLabel} icon={<TrendingUp size={20} />}   tone="blue" />
          <KPI title="Expenses this month"   value={formatAED(totalExpenses)}  sub={monthLabel} icon={<Receipt size={20} />}      tone="rose" />
          <KPI
            title="Net profit this month"
            value={formatAED(netProfit)}
            sub={netProfit >= 0 ? "Profitable" : "Loss"}
            icon={<DollarSign size={20} />}
            tone={netProfit >= 0 ? "emerald" : "rose"}
          />
        </section>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/accounting/expenses">
            <Card className="flex items-center gap-4 p-5 transition hover:shadow-md cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Receipt size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Expenses</p>
                <p className="text-sm text-slate-500">Record and review all business expenses</p>
              </div>
            </Card>
          </Link>
          <Link href="/accounting/ledger">
            <Card className="flex items-center gap-4 p-5 transition hover:shadow-md cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <BookOpen size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Ledger Book</p>
                <p className="text-sm text-slate-500">Full double-entry journal with DR / CR lines</p>
              </div>
            </Card>
          </Link>
        </div>

        {/* Live Exchange Rates */}
        {Object.keys(rates).length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={15} className="text-slate-400" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Live Exchange Rates · 1 unit = AED</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(rates).map(([cur, rate]) => (
                <div key={cur} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-400">{cur}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {rate.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400">AED per 1 {cur}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* P&L — client component with date range picker */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <FileSpreadsheet size={18} className="text-slate-500" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Profit &amp; Loss</h2>
              <p className="text-sm text-slate-500">Select a date range to generate the report</p>
            </div>
          </div>
          <div className="p-6">
            <PLClient />
          </div>
        </Card>

      </div>
    </main>
  );
}
