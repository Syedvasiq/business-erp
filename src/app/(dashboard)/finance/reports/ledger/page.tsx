"use client";

import { useEffect, useState, useRef } from "react";
import { formatAED } from "@/lib/utils";
import { BookOpen, Loader2, ArrowLeft, Download, Printer } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

const TYPE_BADGE: Record<string, string> = {
  ASSET:     "bg-sky-50 text-sky-700",
  LIABILITY: "bg-amber-50 text-amber-700",
  EQUITY:    "bg-violet-50 text-violet-700",
  REVENUE:   "bg-emerald-50 text-emerald-700",
  EXPENSE:   "bg-rose-50 text-rose-700",
};

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20";

export default function LedgerPage() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");

  const [accounts, setAccounts]     = useState<any[]>([]);
  const [accountId, setAccountId]   = useState("");
  const [from, setFrom]             = useState(`${y}-01-01`);
  const [to, setTo]                 = useState(`${y}-${m}-${String(now.getDate()).padStart(2, "0")}`);
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/finance/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(Array.isArray(d) ? d : []));
  }, []);

  const generate = async () => {
    if (!accountId) return setError("Please select an account.");
    setError("");
    setLoading(true);
    const res = await fetch(`/api/finance/reports?report=ledger&accountId=${accountId}&from=${from}&to=${to}`);
    const d   = await res.json();
    setLoading(false);
    if (!res.ok) return setError(d.error ?? "Failed to load ledger.");
    setData(d);
  };

  const exportCSV = () => {
    if (!data) return;
    const header = ["Date", "Reference", "Description", "Debit (AED)", "Credit (AED)", "Balance (AED)"];
    const rows = [
      ["", "", "Opening Balance", "", "", data.openingBalance.toFixed(2)],
      ...data.rows.map((r: any) => [
        new Date(r.date).toLocaleDateString("en-AE"),
        r.reference,
        r.description,
        r.debit  != null ? Number(r.debit).toFixed(2)  : "",
        r.credit != null ? Number(r.credit).toFixed(2) : "",
        Number(r.balance).toFixed(2),
      ]),
      ["", "", "Closing Balance", data.totalDebit.toFixed(2), data.totalCredit.toFixed(2), data.closingBalance.toFixed(2)],
    ];
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `ledger-${data.account.code}-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => window.print();

  // Group accounts by type for optgroup
  const grouped = accounts.reduce((acc: Record<string, any[]>, a) => {
    (acc[a.type] = acc[a.type] ?? []).push(a);
    return acc;
  }, {});
  const typeOrder = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

  return (
    <main className="min-h-full bg-slate-50 print:bg-white">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 print:max-w-full print:p-0">

        {/* Header */}
        <Card className="p-5 sm:p-6 print:hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance · Reports</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Account Transactions</h1>
                <p className="mt-0.5 text-sm text-slate-500">Ledger view for any chart of accounts entry</p>
              </div>
            </div>
            {data && (
              <div className="flex items-center gap-2">
                <button onClick={exportCSV}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Download size={14} /> Export CSV
                </button>
                <button onClick={print}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Printer size={14} /> Print
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-5 sm:p-6 print:hidden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Account *</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                <option value="">Select account…</option>
                {typeOrder.map((type) =>
                  grouped[type]?.length ? (
                    <optgroup key={type} label={type}>
                      {grouped[type].map((a) => (
                        <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                      ))}
                    </optgroup>
                  ) : null
                )}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-end">
              <button onClick={generate} disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                {loading ? "Loading…" : "Run Report"}
              </button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
        </Card>

        {/* Quick date presets */}
        <div className="flex flex-wrap gap-2 print:hidden">
          {[
            { label: "This Month",    f: `${y}-${m}-01`,    t: to },
            { label: "Last Month",    f: (() => { const d = new Date(y, now.getMonth() - 1, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; })(),
                                      t: (() => { const d = new Date(y, now.getMonth(), 0);     return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })() },
            { label: "This Year",     f: `${y}-01-01`,      t: to },
            { label: "Last Year",     f: `${y-1}-01-01`,    t: `${y-1}-12-31` },
            { label: "All Time",      f: "2000-01-01",      t: to },
          ].map(({ label, f, t }) => (
            <button key={label}
              onClick={() => { setFrom(f); setTo(t); }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${from === f && to === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        {data && (
          <div ref={printRef}>
            {/* Print header */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Account Transactions</h1>
              <p className="text-sm text-slate-600">{data.account.code} · {data.account.name}</p>
              <p className="text-sm text-slate-500">
                {new Date(data.from).toLocaleDateString("en-AE")} — {new Date(data.to).toLocaleDateString("en-AE")}
              </p>
            </div>

            {/* Account info + summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
              <Card className="p-5 sm:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Account</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{data.account.name}</p>
                <p className="text-sm font-mono text-slate-500">{data.account.code}</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${TYPE_BADGE[data.account.type] ?? "bg-slate-100 text-slate-600"}`}>
                  {data.account.type}
                </span>
              </Card>
              {[
                { label: "Opening Balance", value: data.openingBalance, color: "text-slate-800" },
                { label: "Total Debits",    value: data.totalDebit,     color: "text-emerald-600" },
                { label: "Total Credits",   value: data.totalCredit,    color: "text-sky-600" },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className={`mt-2 text-xl font-bold tabular-nums ${color}`}>{formatAED(value)}</p>
                </Card>
              ))}
            </div>

            {/* Transactions table */}
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-slate-400" />
                  <h2 className="text-base font-semibold text-slate-900">
                    {data.account.code} · {data.account.name}
                  </h2>
                </div>
                <span className="text-sm text-slate-400">
                  {new Date(data.from).toLocaleDateString("en-AE")} — {new Date(data.to).toLocaleDateString("en-AE")}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Date", "Reference", "Description", "Debit (AED)", "Credit (AED)", "Balance (AED)"].map((h) => (
                        <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 ${h.includes("AED") ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening balance row */}
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <td className="px-5 py-3 text-xs font-semibold text-slate-500" colSpan={3}>
                        Opening Balance — {new Date(data.from).toLocaleDateString("en-AE")}
                      </td>
                      <td className="px-5 py-3 text-right" />
                      <td className="px-5 py-3 text-right" />
                      <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatAED(data.openingBalance)}
                      </td>
                    </tr>

                    {data.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                          No transactions in this period
                        </td>
                      </tr>
                    )}

                    {data.rows.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                          {new Date(row.date).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-sky-700 whitespace-nowrap">{row.reference}</td>
                        <td className="px-5 py-3.5 text-slate-700 max-w-xs truncate">{row.description}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-emerald-600">
                          {row.debit != null ? formatAED(row.debit) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-sky-600">
                          {row.credit != null ? formatAED(row.credit) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`px-5 py-3.5 text-right tabular-nums font-bold ${Number(row.balance) >= 0 ? "text-slate-800" : "text-rose-600"}`}>
                          {formatAED(Number(row.balance))}
                        </td>
                      </tr>
                    ))}

                    {/* Closing balance / totals row */}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td colSpan={3} className="px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-600">
                        Closing Balance — {new Date(data.to).toLocaleDateString("en-AE")}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-bold text-emerald-600">
                        {formatAED(data.totalDebit)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-bold text-sky-600">
                        {formatAED(data.totalCredit)}
                      </td>
                      <td className={`px-5 py-4 text-right tabular-nums font-bold text-lg ${data.closingBalance >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                        {formatAED(data.closingBalance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {!data && !loading && (
          <Card className="p-16 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm text-slate-400">Select an account and date range, then click Run Report</p>
          </Card>
        )}

      </div>
    </main>
  );
}
