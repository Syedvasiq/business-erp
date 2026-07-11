import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { CommissionActions } from "./CommissionActions";
import { Users, Wallet, CheckCircle2, BarChart3 } from "lucide-react";

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function StatCard({
  title, value, sub, icon, tone = "default",
}: {
  title: string; value: string; sub?: string; icon: React.ReactNode;
  tone?: "default" | "blue" | "emerald" | "amber" | "violet";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    blue:    "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50 text-amber-700",
    violet:  "bg-violet-50 text-violet-700",
  };
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      </div>
    </SurfaceCard>
  );
}

function AgentBadge({ isInternal }: { isInternal: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
      isInternal ? "bg-sky-50 text-sky-700 ring-sky-100" : "bg-amber-50 text-amber-700 ring-amber-100"
    }`}>
      {isInternal ? "Internal" : "External"}
    </span>
  );
}

function StatusBadge({ isPaid }: { isPaid: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
      isPaid ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100"
    }`}>
      {isPaid ? "Paid" : "Pending"}
    </span>
  );
}

export default async function CommissionsPage() {
  const [commissions, agents] = await Promise.all([
    prisma.commission.findMany({
      include: { agent: true, invoice: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPending = commissions.filter((c) => !c.isPaid).reduce((s, c) => s + Number(c.totalPayout), 0);
  const totalPaid    = commissions.filter((c) =>  c.isPaid).reduce((s, c) => s + Number(c.totalPayout), 0);
  const pendingCount = commissions.filter((c) => !c.isPaid).length;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">

        {/* Page header */}
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Agent payouts</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Commissions</h1>
              <p className="mt-1 text-sm text-slate-500">Agent and broker payouts linked to sales invoices.</p>
            </div>
            <div className="w-full sm:w-auto">
              <CommissionActions agents={agents} />
            </div>
          </div>
        </SurfaceCard>

        {/* KPI strip */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Pending payouts"  value={formatAED(totalPending)} sub={`${pendingCount} unpaid records`}       icon={<Wallet size={20} />}      tone="amber"   />
          <StatCard title="Total paid out"   value={formatAED(totalPaid)}    sub="Settled commissions"                    icon={<CheckCircle2 size={20} />} tone="emerald" />
          <StatCard title="Total records"    value={String(commissions.length)} sub="All commission entries"              icon={<BarChart3 size={20} />}    tone="violet"  />
          <StatCard title="Agents / brokers" value={String(agents.length)}   sub="Active in directory"                    icon={<Users size={20} />}        tone="blue"    />
        </section>

        {/* Desktop table */}
        <SurfaceCard className="hidden overflow-hidden lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Agent", "Type", "Invoice", "Customer", "Base (ex-VAT)", "Rate", "VAT on Comm", "Total Payout", "Status", ""].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 ${i >= 4 && i <= 7 ? "text-right" : i === 8 || i === 9 ? "text-center" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissions.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                    No commissions yet. Assign an agent when creating an invoice.
                  </td>
                </tr>
              )}
              {commissions.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.agent.name}</td>
                  <td className="px-4 py-3"><AgentBadge isInternal={c.agent.isInternal} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-sky-600">{c.invoice.number}</td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-slate-600">{c.invoice.customer.name}</td>
                  <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">{formatAED(Number(c.baseAmount))}</td>
                  <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">{Number(c.rate)}%</td>
                  <td className="px-4 py-3 text-right text-slate-500 [font-variant-numeric:tabular-nums]">{formatAED(Number(c.vatOnComm))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(Number(c.totalPayout))}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge isPaid={c.isPaid} /></td>
                  <td className="px-4 py-3 text-center">
                    {!c.isPaid && (
                      <CommissionActions agents={agents} markPaidId={c.id} markPaidAmount={Number(c.totalPayout)} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SurfaceCard>

        {/* Mobile cards */}
        <div className="space-y-4 lg:hidden">
          <div className="px-1">
            <h2 className="text-base font-semibold text-slate-900">Commission register</h2>
            <p className="mt-1 text-sm text-slate-500">{commissions.length} records</p>
          </div>

          {commissions.length === 0 && (
            <SurfaceCard className="p-8 text-center text-sm text-slate-400">
              No commissions yet. Assign an agent when creating an invoice.
            </SurfaceCard>
          )}

          {commissions.map((c) => (
            <SurfaceCard key={c.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-sky-700">{c.invoice.number}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{c.agent.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500 truncate">{c.invoice.customer.name}</p>
                </div>
                <StatusBadge isPaid={c.isPaid} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <AgentBadge isInternal={c.agent.isInternal} />
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {Number(c.rate)}% rate
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Base (ex-VAT)</p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(Number(c.baseAmount))}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">VAT on Comm</p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(Number(c.vatOnComm))}</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-slate-900 px-4 py-3 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Total Payout</p>
                  <p className="mt-1 text-lg font-semibold [font-variant-numeric:tabular-nums]">{formatAED(Number(c.totalPayout))}</p>
                </div>
              </div>

              {!c.isPaid && (
                <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                  <CommissionActions agents={agents} markPaidId={c.id} markPaidAmount={Number(c.totalPayout)} />
                </div>
              )}
            </SurfaceCard>
          ))}
        </div>

      </div>
    </main>
  );
}
