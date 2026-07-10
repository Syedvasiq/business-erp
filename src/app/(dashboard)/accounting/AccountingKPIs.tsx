"use client";

import { useState, useEffect } from "react";
import { formatAED } from "@/lib/utils";
import { ShoppingCart, TrendingUp, Receipt, DollarSign, Loader2 } from "lucide-react";

const PERIODS = [
  { label: "Last 30 days",  days: 30  },
  { label: "Last 90 days",  days: 90  },
  { label: "Last 6 months", days: 180 },
  { label: "Last 1 year",   days: 365 },
  { label: "This month",    days: 0   }, // special
  { label: "This year",     days: -1  }, // special
] as const;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function KPI({ title, value, sub, icon, tone, loading }: {
  title: string; value: string; sub?: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "rose" | "violet";
  loading?: boolean;
}) {
  const tones = {
    blue:    "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50 text-amber-700",
    rose:    "bg-rose-50 text-rose-700",
    violet:  "bg-violet-50 text-violet-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
          {loading
            ? <div className="mt-2 h-8 w-28 animate-pulse rounded-xl bg-slate-100" />
            : <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
          }
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

export function AccountingKPIs() {
  const [periodIdx, setPeriodIdx] = useState(4); // default: This month
  const [data, setData] = useState<{ purchases: number; sales: number; expenses: number; netProfit: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const period = PERIODS[periodIdx];

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    let fromStr: string;
    let toStr: string;

    const pad = (n: number) => String(n).padStart(2, "0");
    const localDate = (y: number, m: number, d: number) =>
      `${y}-${pad(m + 1)}-${pad(d)}`;

    if (period.days === 0) {
      // This month — e.g. 2026-07-01 to 2026-07-31
      fromStr = localDate(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      toStr   = localDate(now.getFullYear(), now.getMonth(), lastDay);
    } else if (period.days === -1) {
      // This year — e.g. 2026-01-01 to 2026-12-31
      fromStr = `${now.getFullYear()}-01-01`;
      toStr   = `${now.getFullYear()}-12-31`;
    } else {
      const from = new Date(now);
      from.setDate(from.getDate() - period.days);
      fromStr = localDate(from.getFullYear(), from.getMonth(), from.getDate());
      toStr   = localDate(now.getFullYear(), now.getMonth(), now.getDate());
    }
    fetch(`/api/accounting?report=pl&from=${fromStr}&to=${toStr}`)
      .then((r) => r.json())
      .then((pl) => {
        setData({
          purchases: pl.totalPurchaseCost ?? 0,
          sales:     pl.revenue ?? 0,
          expenses:  pl.operatingExpenses ?? 0,
          netProfit: pl.netProfit ?? 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [periodIdx]);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Period</p>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                periodIdx === i
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI title="Purchases"  value={formatAED(data?.purchases ?? 0)} sub={period.label} icon={<ShoppingCart size={20} />} tone="amber"   loading={loading} />
        <KPI title="Sales"      value={formatAED(data?.sales ?? 0)}     sub={period.label} icon={<TrendingUp size={20} />}   tone="blue"    loading={loading} />
        <KPI title="Expenses"   value={formatAED(data?.expenses ?? 0)}  sub={period.label} icon={<Receipt size={20} />}      tone="rose"    loading={loading} />
        <KPI
          title="Net Profit"
          value={formatAED(data?.netProfit ?? 0)}
          sub={(data?.netProfit ?? 0) >= 0 ? "Profitable" : "Loss"}
          icon={<DollarSign size={20} />}
          tone={(data?.netProfit ?? 0) >= 0 ? "emerald" : "rose"}
          loading={loading}
        />
      </div>
    </div>
  );
}
