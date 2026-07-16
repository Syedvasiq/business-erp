"use client";

import { useEffect, useState, useCallback } from "react";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowDownCircle, ArrowUpCircle, Users, Truck, Building2,
  TrendingUp, AlertCircle, RefreshCw, ArrowLeftRight, GitMerge, Receipt,
  FileSpreadsheet, PieChart as PieIcon, DollarSign, Calendar, X, Package, UserCheck, BookOpen,
} from "lucide-react";
import { FinanceCharts } from "./FinanceCharts";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

function KpiCard({ title, value, sub, icon, tone, href }: {
  title: string; value: string; sub: string; icon: React.ReactNode;
  tone: "blue" | "emerald" | "rose" | "amber" | "violet"; href: string;
}) {
  const tones = {
    blue:    "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose:    "bg-rose-50 text-rose-600",
    amber:   "bg-amber-50 text-amber-600",
    violet:  "bg-violet-50 text-violet-600",
  };
  return (
    <Link href={href}>
      <Card className="p-5 transition hover:shadow-md cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{sub}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
        </div>
      </Card>
    </Link>
  );
}

type Preset = "month" | "90d" | "6m" | "year" | "custom";

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string; label: string } {
  const today = new Date();
  const yr = today.getFullYear();
  const mo = today.getMonth(); // 0-based
  // last day of current month
  const lastDay = new Date(yr, mo + 1, 0).getDate();
  const endOfMonth = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const startOfMonth = `${yr}-${String(mo + 1).padStart(2, "0")}-01`;
  if (preset === "month") return { from: startOfMonth, to: endOfMonth, label: "This Month" };
  if (preset === "90d") {
    const f = new Date(yr, mo, today.getDate() - 89);
    return { from: toISO(f), to: toISO(today), label: "Last 90 Days" };
  }
  if (preset === "6m") {
    const f = new Date(yr, mo - 5, 1);
    return { from: toISO(f), to: endOfMonth, label: "Last 6 Months" };
  }
  if (preset === "year") return { from: `${yr}-01-01`, to: `${yr}-12-31`, label: `This Year (${yr})` };
  return { from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` };
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: "month", label: "This Month" },
  { key: "90d",   label: "90 Days" },
  { key: "6m",    label: "6 Months" },
  { key: "year",  label: "This Year" },
  { key: "custom",label: "Custom" },
];

const quickLinks = [
  { href: "/finance/payments-received",   label: "Payments Received",   icon: ArrowDownCircle,  color: "text-emerald-600 bg-emerald-50" },
  { href: "/finance/payments-made",       label: "Payments Made",        icon: ArrowUpCircle,    color: "text-rose-600 bg-rose-50" },
  { href: "/finance/aged-receivables",    label: "Accounts Receivable",  icon: AlertCircle,      color: "text-sky-600 bg-sky-50" },
  { href: "/finance/aged-payables",       label: "Accounts Payable",     icon: FileSpreadsheet,  color: "text-amber-600 bg-amber-50" },
  { href: "/finance/expenses",            label: "Expenses",             icon: Receipt,          color: "text-rose-600 bg-rose-50" },
  { href: "/finance/profit-sharing",      label: "Profit Sharing",       icon: DollarSign,       color: "text-violet-600 bg-violet-50" },
  { href: "/finance/bank-accounts",       label: "Bank Accounts",        icon: Building2,        color: "text-slate-600 bg-slate-100" },
  { href: "/finance/reconciliation",      label: "Reconciliation",       icon: GitMerge,         color: "text-slate-600 bg-slate-100" },
  { href: "/finance/customers",           label: "Customer Statements",  icon: Users,            color: "text-sky-600 bg-sky-50" },
  { href: "/finance/suppliers",           label: "Supplier Statements",  icon: Truck,            color: "text-amber-600 bg-amber-50" },
  { href: "/finance/reports/profit-loss", label: "Profit & Loss",        icon: TrendingUp,       color: "text-emerald-600 bg-emerald-50" },
  { href: "/finance/reports/financial",   label: "Financial Reports",    icon: PieIcon,          color: "text-emerald-600 bg-emerald-50" },
  { href: "/finance/reports/ledger",      label: "Account Transactions", icon: BookOpen,         color: "text-sky-600 bg-sky-50" },
];

const inputCls = "rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500";

export default function FinanceDashboard() {
  const today = new Date();
  const [preset, setPreset]           = useState<Preset>("month");
  const [customFrom, setCustomFrom]   = useState(toISO(new Date(today.getFullYear(), 0, 1)));
  const [customTo, setCustomTo]       = useState(toISO(today));
  const [showCustom, setShowCustom]   = useState(false);
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);

  const range = getRange(preset, customFrom, customTo);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/finance/dashboard?from=${range.from}&to=${range.to}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const handlePreset = (key: Preset) => {
    if (key === "custom") { setShowCustom(true); return; }
    setPreset(key);
    setShowCustom(false);
  };

  const applyCustom = () => {
    setPreset("custom");
    setShowCustom(false);
  };

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        {/* Header card with filter */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Finance Dashboard</h1>

            </div>

            {/* Filter bar */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(({ key, label }) => (
                  <button key={key} onClick={() => handlePreset(key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                      preset === key && key !== "custom"
                        ? "bg-slate-900 text-white shadow-sm"
                        : key === "custom"
                        ? "border border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700"
                        : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}>
                    {key === "custom" && <Calendar size={12} />}
                    {label}
                    {preset === "custom" && key === "custom" && (
                      <span className="ml-1 text-[10px] text-slate-400">{customFrom} → {customTo}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom date picker inline */}
              {showCustom && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">From</label>
                    <input type="date" className={inputCls} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">To</label>
                    <input type="date" className={inputCls} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                  </div>
                  <button onClick={applyCustom}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                    Apply
                  </button>
                  <button onClick={() => setShowCustom(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Active range label */}
              <p className="text-[11px] text-slate-400">
                Showing: <span className="font-semibold text-slate-600">{range.label}</span>
              </p>
            </div>
          </div>
        </Card>

        {loading || !data ? (
          <Card className="p-16 text-center text-sm text-slate-400">Loading…</Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Accounts Receivable" value={formatAED(data.totalAR)} sub={`${data.outstandingInvoicesCount} unpaid invoices (current)`} icon={<ArrowDownCircle size={20} />} tone="blue" href="/finance/aged-receivables" />
              <KpiCard title="Accounts Payable" value={formatAED(data.totalAP)} sub={`${data.outstandingPOsCount} unpaid POs (current)`} icon={<ArrowUpCircle size={20} />} tone="rose" href="/finance/aged-payables" />
              <KpiCard title="Cash & Bank Balance" value={formatAED(data.totalBankBalance)} sub={`${data.bankAccountsCount} active bank accounts`} icon={<Building2 size={20} />} tone="emerald" href="/finance/bank-accounts" />
              <KpiCard title="Overdue Invoices" value={String(data.overdueCount)} sub="Outstanding 30 days +" icon={<AlertCircle size={20} />} tone="amber" href="/finance/aged-receivables" />
            </div>

            {/* Charts */}
            <FinanceCharts
              monthlyData={data.monthlyData}
              expenseByCategory={data.expenseByCategory}
              paymentByMethod={data.paymentByMethod}
              agingData={data.agingData}
              isSingleMonth={data.isSingleMonth}
            />

            {/* This period + Directory */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={14} className="text-slate-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Period Summary</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                    <span className="text-sm font-medium text-emerald-700">Receipts from Customers</span>
                    <span className="font-semibold tabular-nums text-emerald-700">{formatAED(data.periodReceipts)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
                    <span className="text-sm font-medium text-rose-700">Payments to Suppliers</span>
                    <span className="font-semibold tabular-nums text-rose-700">{formatAED(data.periodPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Net Cash Movement</span>
                    <span className={`font-semibold tabular-nums ${data.periodReceipts - data.periodPaid >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatAED(data.periodReceipts - data.periodPaid)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeftRight size={14} className="text-slate-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Directory</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/customers" className="rounded-xl bg-sky-50 px-4 py-3 text-center hover:bg-sky-100 transition">
                    <p className="text-2xl font-bold text-sky-700">{data.customers}</p>
                    <p className="text-xs font-medium text-sky-600 mt-0.5">Customers</p>
                  </Link>
                  <Link href="/suppliers" className="rounded-xl bg-amber-50 px-4 py-3 text-center hover:bg-amber-100 transition">
                    <p className="text-2xl font-bold text-amber-700">{data.suppliers}</p>
                    <p className="text-xs font-medium text-amber-600 mt-0.5">Suppliers</p>
                  </Link>
                  <Link href="/inventory" className="rounded-xl bg-emerald-50 px-4 py-3 text-center hover:bg-emerald-100 transition">
                    <p className="text-2xl font-bold text-emerald-700">{data.inventory}</p>
                    <p className="text-xs font-medium text-emerald-600 mt-0.5">Inventory</p>
                  </Link>
                  <Link href="/commissions" className="rounded-xl bg-violet-50 px-4 py-3 text-center hover:bg-violet-100 transition">
                    <p className="text-2xl font-bold text-violet-700">{data.partners}</p>
                    <p className="text-xs font-medium text-violet-600 mt-0.5">Partners</p>
                  </Link>
                </div>
              </Card>
            </div>

            {/* Quick Links */}
            <Card className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-4">Quick Access</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickLinks.map(({ href, label, icon: Icon, color }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
                      <Icon size={15} />
                    </div>
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </>
        )}

      </div>
    </main>
  );
}
