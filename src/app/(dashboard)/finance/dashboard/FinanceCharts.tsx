"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const fmt = (v: number) =>
  v >= 1000 ? `AED ${(v / 1000).toFixed(0)}k` : `AED ${v.toFixed(0)}`;

const EXPENSE_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#f97316","#14b8a6","#ec4899","#64748b"];
const METHOD_COLORS  = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444"];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

function ChartTitle({ label }: { label: string }) {
  return <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>;
}

const tipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };
const tipFmt = (v: unknown) => `AED ${Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2 })}`;

export function FinanceCharts({
  monthlyData,
  expenseByCategory,
  paymentByMethod,
  agingData,
  isSingleMonth,
}: {
  monthlyData:        { month: string; revenue: number; expenses: number }[];
  expenseByCategory:  { name: string; value: number }[];
  paymentByMethod:    { name: string; value: number }[];
  agingData:          { bucket: string; amount: number }[];
  isSingleMonth?:     boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

      {/* Revenue vs Expenses bar — 2 cols */}
      <Card className="p-5 xl:col-span-2">
        <ChartTitle label={isSingleMonth ? "Daily Revenue vs Expenses" : "Revenue vs Expenses"} />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} barCategoryGap="18%">
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={70} />
            <Tooltip formatter={tipFmt} contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="revenue"  name="Revenue"  fill="#10b981" radius={[6,6,0,0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Expense breakdown pie — 1 col */}
      <Card className="p-5">
        <ChartTitle label="Expense Breakdown" />
        {expenseByCategory.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-slate-400">No expense data</div>
        ) : (
          <div className="flex flex-col gap-3">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={80} label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={11}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={tipFmt} contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom legend with amounts */}
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {expenseByCategory.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                    <span className="truncate text-xs text-slate-600">{item.name}</span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-800">
                    AED {item.value.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* AR Aging bar — 2 cols */}
      <Card className="p-5 xl:col-span-2">
        <ChartTitle label="AR Aging Buckets (Outstanding)" />
        {agingData.every(d => d.amount === 0) ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No outstanding receivables</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agingData} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={tipFmt} contentStyle={tipStyle} />
              <Bar dataKey="amount" name="Outstanding" radius={[0,6,6,0]}
                fill="#f43f5e"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Payment method donut — 1 col */}
      <Card className="p-5">
        <ChartTitle label="Payments by Method" />
        {paymentByMethod.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No payment data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentByMethod} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={50} outerRadius={80} paddingAngle={3}>
                {paymentByMethod.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={tipFmt} contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

    </div>
  );
}
