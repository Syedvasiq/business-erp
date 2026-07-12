"use client";

import { useState } from "react";
import { formatAED } from "@/lib/utils";
import { Receipt, Loader2 } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

export default function VAT201Page() {
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo]     = useState(`${y}-12-31`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/reports?report=vat201&from=${from}&to=${to}`);
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">VAT Return — Form 201</h1>
              <p className="mt-0.5 text-sm text-slate-500">UAE FTA VAT return by emirate</p>
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
              {loading && <Loader2 size={14} className="animate-spin" />} Generate
            </button>
          </div>
        </Card>

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="p-5 bg-sky-50 border-sky-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">Output VAT (Collected)</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-sky-700">{formatAED(data.totalOutputVat)}</p>
              </Card>
              <Card className="p-5 bg-emerald-50 border-emerald-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Input VAT (Recoverable)</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">{formatAED(data.totalInputVat)}</p>
              </Card>
              <Card className={`p-5 ${data.netVatPayable > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${data.netVatPayable > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  Net VAT Payable to FTA
                </p>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${data.netVatPayable > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatAED(data.netVatPayable)}
                </p>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                <Receipt size={16} className="text-slate-400" />
                <h2 className="text-base font-semibold text-slate-900">Output VAT by Emirate</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Emirate", "Taxable Amount (AED)", "VAT Collected (AED)"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(data.outputByEmirate).length === 0 && (
                      <tr><td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">No taxable sales in this period</td></tr>
                    )}
                    {Object.entries(data.outputByEmirate).map(([emirate, d]: [string, any]) => (
                      <tr key={emirate} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-5 py-4 text-sm font-medium text-slate-800">{emirate}</td>
                        <td className="px-5 py-4 text-sm tabular-nums text-slate-700">{formatAED(d.taxable)}</td>
                        <td className="px-5 py-4 text-sm font-semibold tabular-nums text-sky-700">{formatAED(d.vat)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="px-5 py-3 text-sm font-bold text-slate-700">Total</td>
                      <td className="px-5 py-3 text-sm font-bold tabular-nums text-slate-800">
                        {formatAED(Object.values(data.outputByEmirate).reduce((s: number, d: any) => s + d.taxable, 0))}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold tabular-nums text-sky-700">{formatAED(data.totalOutputVat)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Total Output VAT</span><span className="font-semibold tabular-nums text-slate-800">{formatAED(data.totalOutputVat)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Less: Input VAT Recoverable</span><span className="font-semibold tabular-nums text-emerald-600">− {formatAED(data.totalInputVat)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-slate-800">Net VAT Payable to FTA</span>
                  <span className={`text-base font-bold tabular-nums ${data.netVatPayable > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatAED(data.netVatPayable)}</span>
                </div>
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
