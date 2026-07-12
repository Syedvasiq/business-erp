"use client";

import { useState } from "react";
import { formatAED, CT_FREE_THRESHOLD, CT_RATE, SBR_THRESHOLD } from "@/lib/utils";
import { BadgePercent, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

export default function CorporateTaxPage() {
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo]     = useState(`${y}-12-31`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/reports?report=ct&from=${from}&to=${to}`);
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Corporate Tax Planner</h1>
              <p className="mt-0.5 text-sm text-slate-500">UAE CT — 0% up to AED 375,000 · 9% above · AED 3M Small Business Relief</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
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
              {loading && <Loader2 size={14} className="animate-spin" />} Calculate
            </button>
          </div>
        </Card>

        {data && (
          <>
            {data.eligibleForSBR ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>Eligible for <strong>Small Business Relief</strong> — net profit below AED {SBR_THRESHOLD.toLocaleString()}. Corporate Tax = AED 0.</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                <AlertCircle size={18} className="shrink-0" />
                <span>Corporate tax applies at <strong>9%</strong> on taxable income above AED {CT_FREE_THRESHOLD.toLocaleString()}.</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Net Profit",      value: formatAED(data.netProfit),     color: data.netProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" },
                { label: "Taxable Income",  value: formatAED(data.taxableIncome), color: "bg-sky-50 text-sky-700" },
                { label: "CT Payable",      value: formatAED(data.ctPayable),     color: data.ctPayable > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700" },
              ].map(({ label, value, color }) => (
                <Card key={label} className={`p-5 ${color.split(" ")[0]}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${color.split(" ")[1]}`}>{label}</p>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${color.split(" ")[1]}`}>{value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BadgePercent size={17} className="text-slate-500" />
                <h2 className="text-base font-semibold text-slate-900">Corporate Tax Calculation</h2>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-1">
                <Row label="Net Profit" value={formatAED(data.netProfit)} bold positive={data.netProfit >= 0} negative={data.netProfit < 0} />
                <Row label={`Free Threshold (0% rate)`} value={`− ${formatAED(CT_FREE_THRESHOLD)}`} indent />
                <Row label="Taxable Income" value={formatAED(data.taxableIncome)} bold />
                <Row label={`Corporate Tax Rate`} value={`${CT_RATE * 100}%`} indent />
                <Row label="Corporate Tax Payable" value={formatAED(data.ctPayable)} bold separator negative={data.ctPayable > 0} positive={data.ctPayable === 0} />
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 space-y-1">
                <p>• 0% rate applies on first AED {CT_FREE_THRESHOLD.toLocaleString()} of taxable income</p>
                <p>• 9% rate applies on taxable income above AED {CT_FREE_THRESHOLD.toLocaleString()}</p>
                <p>• Small Business Relief available for businesses with revenue ≤ AED {SBR_THRESHOLD.toLocaleString()}</p>
              </div>
            </Card>
          </>
        )}

        {!data && !loading && (
          <Card className="p-12 text-center">
            <BadgePercent size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">Select a date range and click Calculate</p>
          </Card>
        )}

      </div>
    </main>
  );
}
