"use client";

import { useState } from "react";
import { formatAED } from "@/lib/utils";
import { Activity, Loader2 } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-sky-50 text-sky-700", LIABILITY: "bg-amber-50 text-amber-700",
  EQUITY: "bg-violet-50 text-violet-700", REVENUE: "bg-emerald-50 text-emerald-700", EXPENSE: "bg-rose-50 text-rose-700",
};

export default function TrialBalancePage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch("/api/finance/reports?report=trial-balance");
    setData(await res.json());
    setLoading(false);
  };

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">←</Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance · Reports</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Trial Balance</h1>
                <p className="mt-0.5 text-sm text-slate-500">All accounts with total debits and credits</p>
              </div>
            </div>
            <button onClick={generate} disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Loading…" : "Generate Trial Balance"}
            </button>
          </div>
        </Card>

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Total Debits",  value: formatAED(data.grandDr), color: "bg-emerald-50 text-emerald-700" },
                { label: "Total Credits", value: formatAED(data.grandCr), color: "bg-sky-50 text-sky-700" },
                { label: "Difference",    value: formatAED(Math.abs(data.grandDr - data.grandCr)), color: Math.abs(data.grandDr - data.grandCr) < 0.01 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className={`mt-2 text-xl font-bold tabular-nums ${color.split(" ")[1]}`}>{value}</p>
                  {label === "Difference" && Math.abs(data.grandDr - data.grandCr) < 0.01 && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium">✓ Balanced</p>
                  )}
                </Card>
              ))}
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                <Activity size={16} className="text-slate-400" />
                <h2 className="text-base font-semibold text-slate-900">Account Balances</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Code", "Account Name", "Type", "Total Debits", "Total Credits", "Balance"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row: any) => (
                      <tr key={row.code} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-mono text-sm text-slate-500">{row.code}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{row.name}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${TYPE_COLORS[row.type] ?? "bg-slate-100 text-slate-600"}`}>{row.type}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm tabular-nums text-emerald-600 font-medium">{formatAED(row.totalDr)}</td>
                        <td className="px-5 py-3.5 text-sm tabular-nums text-sky-600 font-medium">{formatAED(row.totalCr)}</td>
                        <td className={`px-5 py-3.5 text-sm font-bold tabular-nums ${row.balance >= 0 ? "text-slate-800" : "text-rose-600"}`}>{formatAED(row.balance)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td colSpan={3} className="px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-600">Grand Total</td>
                      <td className="px-5 py-4 text-sm font-bold tabular-nums text-emerald-600">{formatAED(data.grandDr)}</td>
                      <td className="px-5 py-4 text-sm font-bold tabular-nums text-sky-600">{formatAED(data.grandCr)}</td>
                      <td className="px-5 py-4 text-sm font-bold tabular-nums text-slate-800">{formatAED(data.grandDr - data.grandCr)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {!data && !loading && (
          <Card className="p-12 text-center text-sm text-slate-400">Click Generate to load the trial balance</Card>
        )}

      </div>
    </main>
  );
}
