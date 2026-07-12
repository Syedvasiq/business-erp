"use client";

import { useState } from "react";
import { formatAED } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

type Tab = "balance-sheet" | "trial-balance" | "cash-flow";

// ── Balance Sheet ─────────────────────────────────────────────────────────────
function BSSection({ title, rows, total, color }: { title: string; rows: any[]; total: number; color: string }) {
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

function BalanceSheetTab() {
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Loading…" : "Generate Balance Sheet"}
        </button>
      </div>

      {!data && !loading && (
        <Card className="p-12 text-center text-sm text-slate-400">Click Generate to load the balance sheet</Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5 bg-sky-50 border-sky-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">Total Assets</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-sky-700">{formatAED(data.totalAssets)}</p>
            </Card>
            <Card className="p-5 bg-amber-50 border-amber-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">Liabilities + Equity</p>
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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 px-1">Assets</p>
              <BSSection title="Assets" rows={data.assets} total={data.totalAssets} color="bg-sky-50 text-sky-700" />
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 px-1">Liabilities & Equity</p>
              <BSSection title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} color="bg-amber-50 text-amber-700" />
              <BSSection
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
    </div>
  );
}

// ── Trial Balance ─────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-sky-50 text-sky-700", LIABILITY: "bg-amber-50 text-amber-700",
  EQUITY: "bg-violet-50 text-violet-700", REVENUE: "bg-emerald-50 text-emerald-700", EXPENSE: "bg-rose-50 text-rose-700",
};

function TrialBalanceTab() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch("/api/finance/reports?report=trial-balance");
    setData(await res.json());
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Loading…" : "Generate Trial Balance"}
        </button>
      </div>

      {!data && !loading && (
        <Card className="p-12 text-center text-sm text-slate-400">Click Generate to load the trial balance</Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Total Debits",  value: formatAED(data.grandDr), color: "text-emerald-700" },
              { label: "Total Credits", value: formatAED(data.grandCr), color: "text-sky-700" },
              { label: "Difference",    value: formatAED(Math.abs(data.grandDr - data.grandCr)), color: Math.abs(data.grandDr - data.grandCr) < 0.01 ? "text-emerald-700" : "text-rose-700" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className={`mt-2 text-xl font-bold tabular-nums ${color}`}>{value}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
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
    </div>
  );
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────
function CashFlowTab() {
  const y = new Date().getFullYear();
  const [from, setFrom]       = useState(`${y}-01-01`);
  const [to, setTo]           = useState(`${y}-12-31`);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/reports?report=cash-flow&from=${from}&to=${to}`);
    setData(await res.json());
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          {([["From", from, setFrom], ["To", to, setTo]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
            <div key={label}>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
              <input type="date" value={val} onChange={(e) => setter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          ))}
          <button onClick={generate} disabled={loading}
            className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Generate
          </button>
        </div>
      </Card>

      {!data && !loading && (
        <Card className="p-12 text-center text-sm text-slate-400">Select a date range and click Generate</Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Operating",  value: data.operating.net, color: data.operating.net >= 0 ? "text-emerald-700" : "text-rose-700" },
              { label: "Investing",  value: data.investing.net, color: "text-sky-700" },
              { label: "Financing",  value: data.financing.net, color: "text-violet-700" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label} Activities</p>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${color}`}>{formatAED(value)}</p>
              </Card>
            ))}
          </div>

          <Card className="p-6 space-y-4">
            {[
              { label: "Operating Activities", color: "bg-emerald-50 text-emerald-700", lines: [
                { label: "Receipts from Customers", value: data.operating.receiptsFromCustomers, sign: "+" },
                { label: "Payments to Suppliers",   value: data.operating.paymentsToSuppliers,   sign: "−" },
                { label: "Operating Expenses Paid", value: data.operating.expenses,               sign: "−" },
              ], net: data.operating.net },
              { label: "Investing Activities",  color: "bg-sky-50 text-sky-700",     lines: [], net: data.investing.net },
              { label: "Financing Activities",  color: "bg-violet-50 text-violet-700", lines: [], net: data.financing.net },
            ].map(({ label, color, lines, net }) => (
              <div key={label} className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className={`px-5 py-3 ${color}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]">{label}</p>
                </div>
                {lines.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-400 text-center">No activities recorded</p>
                ) : (
                  <div className="divide-y divide-slate-100 px-5">
                    {lines.map((l) => (
                      <div key={l.label} className="flex justify-between py-2.5 text-sm">
                        <span className="text-slate-600">{l.label}</span>
                        <span className={`font-semibold tabular-nums ${l.sign === "+" ? "text-emerald-600" : "text-rose-600"}`}>{l.sign}{formatAED(l.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 text-sm font-bold border-t-2 border-slate-200">
                      <span className="text-slate-800">Net {label}</span>
                      <span className={`tabular-nums ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatAED(net)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4">
              <span className="text-sm font-bold text-white">Net Cash Flow</span>
              <span className={`text-xl font-bold tabular-nums ${data.netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatAED(data.netCashFlow)}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancialReportsPage() {
  const [tab, setTab] = useState<Tab>("balance-sheet");

  const tabs: [Tab, string][] = [
    ["balance-sheet", "Balance Sheet"],
    ["trial-balance", "Trial Balance"],
    ["cash-flow",     "Cash Flow"],
  ];

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">←</Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Financial Reports</h1>
              <p className="mt-0.5 text-sm text-slate-500">Balance Sheet · Trial Balance · Cash Flow</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 w-fit">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${tab === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "balance-sheet" && <BalanceSheetTab />}
        {tab === "trial-balance" && <TrialBalanceTab />}
        {tab === "cash-flow"     && <CashFlowTab />}

      </div>
    </main>
  );
}
