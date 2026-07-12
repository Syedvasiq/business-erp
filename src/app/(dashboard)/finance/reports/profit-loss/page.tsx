"use client";

import { useState } from "react";
import { formatAED } from "@/lib/utils";
import { TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

function Row({ label, value, bold, indent, positive, negative, separator }: {
  label: string; value: string; bold?: boolean; indent?: boolean; positive?: boolean; negative?: boolean; separator?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${separator ? "border-t-2 border-slate-200 mt-1" : "border-t border-slate-100"}`}>
      <span className={`text-sm ${indent ? "pl-5 text-slate-500" : bold ? "font-semibold text-slate-800" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-600" : negative ? "text-rose-600" : bold ? "text-slate-900" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}

export default function ProfitLossPage() {
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo]     = useState(`${y}-12-31`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/reports?report=pl&from=${from}&to=${to}`);
    setData(await res.json());
    setLoading(false);
  };

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">←</Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance · Reports</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Profit & Loss</h1>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            {[["From", from, setFrom], ["To", to, setTo]].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">{label as string}</label>
                <input type="date" value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            ))}
            <button onClick={generate} disabled={loading}
              className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />} Generate
            </button>
          </div>
        </Card>

        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Revenue",      value: data.revenue,     cls: "bg-sky-50 text-sky-700" },
                { label: "Gross Profit", value: data.grossProfit, cls: "bg-emerald-50 text-emerald-700" },
                { label: "Total Costs",  value: data.operatingExpenses + data.cogs, cls: "bg-amber-50 text-amber-700" },
                { label: "Net Profit",   value: data.netProfit,   cls: data.netProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" },
              ].map(({ label, value, cls }) => (
                <Card key={label} className={`p-4 ${cls}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
                  <p className="text-xl font-bold tabular-nums mt-1">{formatAED(value)}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={17} className="text-slate-500" />
                <h2 className="text-base font-semibold text-slate-900">Profit & Loss Statement</h2>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-1">
                <Row label="Sales Revenue" value={formatAED(data.revenue)} bold />
                <Row label="Cost of Goods Sold" value={`− ${formatAED(data.cogs)}`} indent negative />
                <Row label="Gross Profit" value={formatAED(data.grossProfit)} bold separator positive={data.grossProfit >= 0} negative={data.grossProfit < 0} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-2">Operating Expenses</p>
                {Object.entries(data.expenses?.breakdown ?? {}).map(([cat, amt]) => (
                  <Row key={cat} label={cat.replace(/_/g, " ")} value={`− ${formatAED(amt as number)}`} indent negative />
                ))}
                {data.commissionExpense > 0 && <Row label="Commission Expense" value={`− ${formatAED(data.commissionExpense)}`} indent negative />}
                <Row label="Total Operating Expenses" value={formatAED(data.operatingExpenses)} bold />
                <Row label="Net Profit" value={formatAED(data.netProfit)} bold separator positive={data.netProfit >= 0} negative={data.netProfit < 0} />
              </div>
            </Card>
          </>
        )}

        {!data && !loading && (
          <Card className="p-12 text-center text-sm text-slate-400">Select a date range and click Generate</Card>
        )}

      </div>
    </main>
  );
}
