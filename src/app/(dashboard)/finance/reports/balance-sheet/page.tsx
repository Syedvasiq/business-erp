"use client";

import { useState } from "react";
import { formatAED } from "@/lib/utils";
import { Scale, Loader2 } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

function Section({ title, rows, total, color }: { title: string; rows: any[]; total: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className={`px-5 py-3 ${color}`}>
        <p className="text-xs font-bold uppercase tracking-[0.16em]">{title}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.code} className="flex items-center justify-between px-5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{r.code}</span>
              <span className="text-sm text-slate-700">{r.name}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-slate-800">{formatAED(r.balance)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
          <span className="text-sm font-bold text-slate-700">Total {title}</span>
          <span className="text-base font-bold tabular-nums text-slate-900">{formatAED(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function BalanceSheetPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch("/api/finance/reports?report=balance-sheet");
    setData(await res.json());
    setLoading(false);
  };

  const balanced = data ? Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01 : false;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">←</Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance · Reports</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Balance Sheet</h1>
                <p className="mt-0.5 text-sm text-slate-500">Assets = Liabilities + Equity</p>
              </div>
            </div>
            <button onClick={generate} disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Loading…" : "Generate Balance Sheet"}
            </button>
          </div>
        </Card>

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="p-5 bg-sky-50 border-sky-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">Total Assets</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-sky-700">{formatAED(data.totalAssets)}</p>
              </Card>
              <Card className="p-5 bg-amber-50 border-amber-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">Total Liabilities + Equity</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-amber-700">{formatAED(data.totalLiabilitiesAndEquity)}</p>
              </Card>
              <Card className={`p-5 ${balanced ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${balanced ? "text-emerald-600" : "text-rose-600"}`}>
                  {balanced ? "✓ Balanced" : "⚠ Imbalanced"}
                </p>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${balanced ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatAED(Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity))}
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500 px-1">Assets</h2>
                <Section title="Assets" rows={data.assets} total={data.totalAssets} color="bg-sky-50 text-sky-700" />
              </div>
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500 px-1">Liabilities & Equity</h2>
                <Section title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} color="bg-amber-50 text-amber-700" />
                <Section
                  title="Equity"
                  rows={[...data.equity, { code: "RE", name: "Retained Earnings", balance: data.retainedEarnings }]}
                  total={data.totalEquity}
                  color="bg-violet-50 text-violet-700"
                />
                <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4">
                  <span className="text-sm font-bold text-white">Total Liabilities & Equity</span>
                  <span className="text-base font-bold tabular-nums text-white">{formatAED(data.totalLiabilitiesAndEquity)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <Card className="p-12 text-center">
            <Scale size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">Click Generate to load the balance sheet</p>
          </Card>
        )}

      </div>
    </main>
  );
}
