"use client";

import { useState } from "react";
import { formatAED, CT_FREE_THRESHOLD, CT_RATE, SBR_THRESHOLD } from "@/lib/utils";
import {
  TrendingUp, ShoppingCart, Receipt, DollarSign,
  Loader2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
} from "lucide-react";

interface PLData {
  revenue: number; cogs: number; grossProfit: number;
  totalPurchaseCost: number;
  expenses: { breakdown: Record<string, number>; total: number };
  commissionExpense: number; operatingExpenses: number; netProfit: number;
}
interface VATData {
  outputByEmirate: Record<string, { taxable: number; vat: number }>;
  totalOutputVat: number; totalInputVat: number; netVatPayable: number;
}
interface CTData {
  netProfit: number; taxableIncome: number; ctPayable: number; eligibleForSBR: boolean;
}

function Row({ label, value, bold, indent, positive, negative, separator }: {
  label: string; value: string; bold?: boolean; indent?: boolean;
  positive?: boolean; negative?: boolean; separator?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${separator ? "border-t-2 border-slate-200 mt-1" : "border-t border-slate-100"}`}>
      <span className={`text-sm ${indent ? "pl-5 text-slate-500" : bold ? "font-semibold text-slate-800" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-600" : negative ? "text-rose-600" : bold ? "text-slate-900" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 text-slate-700">
          {icon}
          <span className="font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export function PLClient() {
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to,   setTo]   = useState(`${y}-12-31`);
  const [pl,   setPL]   = useState<PLData | null>(null);
  const [vat,  setVAT]  = useState<VATData | null>(null);
  const [ct,   setCT]   = useState<CTData | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const p = `from=${from}&to=${to}`;
    const [plRes, vatRes, ctRes] = await Promise.all([
      fetch(`/api/accounting?report=pl&${p}`).then((r) => r.json()),
      fetch(`/api/accounting?report=vat201&${p}`).then((r) => r.json()),
      fetch(`/api/accounting?report=ct&${p}`).then((r) => r.json()),
    ]);
    setPL(plRes); setVAT(vatRes); setCT(ctRes);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        {[["From", from, setFrom], ["To", to, setTo]].map(([label, val, setter]) => (
          <div key={label as string} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{label as string}</label>
            <input type="date" value={val as string}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
        ))}
        <button onClick={generate} disabled={loading}
          className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Loading…" : "Generate"}
        </button>
      </div>

      {!pl && !loading && (
        <p className="py-8 text-center text-sm text-slate-400">Select a date range and click Generate</p>
      )}

      {/* P&L */}
      {pl && (
        <Section title="Profit & Loss Statement" icon={<TrendingUp size={17} />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Revenue",      value: pl.revenue,      cls: "bg-sky-50 text-sky-700" },
              { label: "Gross Profit", value: pl.grossProfit,  cls: "bg-emerald-50 text-emerald-700" },
              { label: "Total Costs",  value: pl.operatingExpenses + pl.cogs, cls: "bg-amber-50 text-amber-700" },
              { label: "Net Profit",   value: pl.netProfit,    cls: pl.netProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-xl px-4 py-3 ${cls}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{formatAED(value)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-1">
            <Row label="Sales Revenue" value={formatAED(pl.revenue)} bold />
            <Row label="Cost of Goods Sold" value={`− ${formatAED(pl.cogs)}`} indent negative />
            <Row label="Gross Profit" value={formatAED(pl.grossProfit)} bold separator positive={pl.grossProfit >= 0} negative={pl.grossProfit < 0} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-2">Operating Expenses</p>
            {Object.entries(pl.expenses.breakdown).map(([cat, amt]) => (
              <Row key={cat} label={cat.replace(/_/g, " ")} value={`− ${formatAED(amt)}`} indent negative />
            ))}
            {pl.expenses.total === 0 && <Row label="No expenses recorded" value="—" indent />}
            {pl.commissionExpense > 0 && (
              <Row label="Commission Expense" value={`− ${formatAED(pl.commissionExpense)}`} indent negative />
            )}
            <Row label="Total Operating Expenses" value={formatAED(pl.operatingExpenses)} bold />
            <Row label="Net Profit" value={formatAED(pl.netProfit)} bold separator positive={pl.netProfit >= 0} negative={pl.netProfit < 0} />
          </div>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <ShoppingCart size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <span>Total purchases received: <strong className="text-slate-800">{formatAED(pl.totalPurchaseCost)}</strong> (excl. VAT). COGS reflects only items sold.</span>
          </div>
        </Section>
      )}

      {/* VAT 201 */}
      {vat && (
        <Section title="VAT Return — Form 201" icon={<Receipt size={17} />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-sky-50 px-4 py-3 text-sky-700">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Output VAT</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{formatAED(vat.totalOutputVat)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Input VAT (Recoverable)</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{formatAED(vat.totalInputVat)}</p>
            </div>
            <div className={`rounded-xl px-4 py-3 ${vat.netVatPayable > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Net VAT Payable to FTA</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{formatAED(vat.netVatPayable)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Emirate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Taxable Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">VAT Collected</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(vat.outputByEmirate).map(([emirate, data]) => (
                  <tr key={emirate} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-700">{emirate}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatAED(data.taxable)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatAED(data.vat)}</td>
                  </tr>
                ))}
                {Object.keys(vat.outputByEmirate).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-sm">No taxable sales in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Corporate Tax */}
      {ct && (
        <Section title="Corporate Tax Planner" icon={<DollarSign size={17} />}>
          {ct.eligibleForSBR ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={15} className="shrink-0" />
              Eligible for Small Business Relief — net profit below AED {SBR_THRESHOLD.toLocaleString()}. Corporate tax = AED 0.
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={15} className="shrink-0" />
              Corporate tax applies at 9% on taxable income above AED {CT_FREE_THRESHOLD.toLocaleString()}.
            </div>
          )}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-1">
            <Row label="Net Profit" value={formatAED(ct.netProfit)} bold positive={ct.netProfit >= 0} negative={ct.netProfit < 0} />
            <Row label="Free Threshold (0% rate)" value={`− ${formatAED(CT_FREE_THRESHOLD)}`} indent />
            <Row label="Taxable Income" value={formatAED(ct.taxableIncome)} bold />
            <Row label={`Corporate Tax (${CT_RATE * 100}%)`} value={formatAED(ct.ctPayable)} bold separator negative={ct.ctPayable > 0} positive={ct.ctPayable === 0} />
          </div>
        </Section>
      )}
    </div>
  );
}
