"use client";

import { useState } from "react";
import { formatAED } from "@/lib/utils";
import { BarChart2, Loader2 } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

export default function CashFlowPage() {
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo]     = useState(`${y}-12-31`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/reports?report=cash-flow&from=${from}&to=${to}`);
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Cash Flow Statement</h1>
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
              {[
                { label: "Operating Activities", value: data.operating.net, color: data.operating.net >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" },
                { label: "Investing Activities", value: data.investing.net, color: "bg-sky-50 text-sky-700" },
                { label: "Financing Activities", value: data.financing.net, color: "bg-violet-50 text-violet-700" },
              ].map(({ label, value, color }) => (
                <Card key={label} className={`p-5 ${color.split(" ").map((c) => c.startsWith("bg-") ? c : "").join(" ")}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${color.split(" ")[1]}`}>{label}</p>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${color.split(" ")[1]}`}>{formatAED(value)}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={17} className="text-slate-500" />
                <h2 className="text-base font-semibold text-slate-900">Cash Flow Detail</h2>
              </div>

              <div className="space-y-4">
                {/* Operating */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-emerald-50 px-5 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Operating Activities</p>
                  </div>
                  <div className="divide-y divide-slate-100 px-5">
                    <div className="flex justify-between py-2.5 text-sm"><span className="text-slate-600">Receipts from Customers</span><span className="font-semibold text-emerald-600 tabular-nums">+{formatAED(data.operating.receiptsFromCustomers)}</span></div>
                    <div className="flex justify-between py-2.5 text-sm"><span className="text-slate-600">Payments to Suppliers</span><span className="font-semibold text-rose-600 tabular-nums">−{formatAED(data.operating.paymentsToSuppliers)}</span></div>
                    <div className="flex justify-between py-2.5 text-sm"><span className="text-slate-600">Operating Expenses Paid</span><span className="font-semibold text-rose-600 tabular-nums">−{formatAED(data.operating.expenses)}</span></div>
                    <div className="flex justify-between py-3 text-sm font-bold border-t-2 border-slate-200">
                      <span className="text-slate-800">Net Operating Cash Flow</span>
                      <span className={`tabular-nums ${data.operating.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatAED(data.operating.net)}</span>
                    </div>
                  </div>
                </div>

                {/* Investing */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-sky-50 px-5 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Investing Activities</p>
                  </div>
                  <div className="px-5 py-4 text-sm text-slate-400 text-center">No investing activities recorded</div>
                </div>

                {/* Financing */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-violet-50 px-5 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Financing Activities</p>
                  </div>
                  <div className="px-5 py-4 text-sm text-slate-400 text-center">No financing activities recorded</div>
                </div>

                {/* Net */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4">
                  <span className="text-sm font-bold text-white">Net Cash Flow</span>
                  <span className={`text-xl font-bold tabular-nums ${data.netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatAED(data.netCashFlow)}</span>
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
