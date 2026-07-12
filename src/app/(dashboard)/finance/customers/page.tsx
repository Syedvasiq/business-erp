import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import { Users, ChevronRight, TrendingUp, Wallet, FileX } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function BalanceBadge({ balance }: { balance: number }) {
  if (balance <= 0) return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Settled</span>;
  if (balance < 5000) return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">{formatAED(balance)}</span>;
  return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">{formatAED(balance)}</span>;
}

export default async function CustomerStatementsPage() {
  const customers = await prisma.customer.findMany({
    include: {
      invoices: {
        where: { status: { not: "CANCELLED" } },
        include: { payments: true },
      },
      creditNotes: { where: { type: "CUSTOMER" } },
    },
    orderBy: { name: "asc" },
  });

  const rows = customers.map((c) => {
    const totalInvoiced = c.invoices.reduce((s, i) => s + Number(i.totalAed), 0);
    const totalPaid     = c.invoices.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0);
    const totalCredits  = c.creditNotes.reduce((s, cn) => s + Number(cn.amount) + Number(cn.vatAmount), 0);
    const balance       = totalInvoiced - totalPaid - totalCredits;
    return { ...c, totalInvoiced, totalPaid, totalCredits, balance };
  });

  const totalAR      = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const totalInvoiced = rows.reduce((s, r) => s + r.totalInvoiced, 0);
  const totalPaid    = rows.reduce((s, r) => s + r.totalPaid, 0);
  const withBalance  = rows.filter((r) => r.balance > 0).length;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
              ←
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Customer Statements</h1>
              <p className="mt-0.5 text-sm text-slate-500">Click any customer to view full statement with running balance</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Customers",   value: String(rows.length),       icon: <Users size={18} />,      color: "bg-sky-50 text-sky-600" },
            { label: "Total Invoiced",    value: formatAED(totalInvoiced),  icon: <TrendingUp size={18} />, color: "bg-violet-50 text-violet-600" },
            { label: "Total Collected",   value: formatAED(totalPaid),      icon: <Wallet size={18} />,     color: "bg-emerald-50 text-emerald-600" },
            { label: "Outstanding AR",    value: formatAED(totalAR),        icon: <FileX size={18} />,      color: "bg-rose-50 text-rose-600" },
          ].map(({ label, value, icon, color }) => (
            <Card key={label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">All Customers</h2>
            <p className="mt-0.5 text-sm text-slate-500">{withBalance} with outstanding balance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Customer", "TRN", "Invoices", "Total Invoiced", "Total Paid", "Credits", "Balance", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">No customers found</td></tr>
                )}
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{c.trn || "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{c.invoices.length}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-slate-700">{formatAED(c.totalInvoiced)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-emerald-600">{formatAED(c.totalPaid)}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-slate-500">{formatAED(c.totalCredits)}</td>
                    <td className="px-5 py-4"><BalanceBadge balance={c.balance} /></td>
                    <td className="px-5 py-4">
                      <Link href={`/finance/customers/${c.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200">
                        Statement <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </main>
  );
}
