import { prisma } from "@/lib/prisma";
import { PLClient } from "./PLClient";
import { AccountingKPIs } from "./AccountingKPIs";
import Link from "next/link";
import {
  TrendingUp, Receipt, BookOpen, RefreshCw, ArrowRightLeft, Landmark,
} from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export default async function AccountingPage() {
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
              <p className="mt-1 text-sm text-slate-500">P&amp;L · VAT · Corporate Tax</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/accounting/receivables"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <TrendingUp size={15} /> Receivables
              </Link>
              <Link href="/accounting/payables"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <ArrowRightLeft size={15} /> Payables
              </Link>
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

        {/* KPI Cards with period selector */}
        <AccountingKPIs />

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/accounting/receivables">
            <Card className="flex items-center gap-4 p-5 transition hover:shadow-md cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Accounts Receivable</p>
                <p className="text-sm text-slate-500">Outstanding invoices &amp; customer credits</p>
              </div>
            </Card>
          </Link>
          <Link href="/accounting/payables">
            <Card className="flex items-center gap-4 p-5 transition hover:shadow-md cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Landmark size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Accounts Payable</p>
                <p className="text-sm text-slate-500">Purchase orders &amp; supplier debit notes</p>
              </div>
            </Card>
          </Link>
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
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{(rate as number).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400">AED per 1 {cur}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* P&L */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
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
