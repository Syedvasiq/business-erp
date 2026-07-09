import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { CommissionActions } from "./CommissionActions";

export default async function CommissionsPage() {
  const [commissions, agents] = await Promise.all([
    prisma.commission.findMany({
      include: { agent: true, invoice: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPending = commissions
    .filter((c) => !c.isPaid)
    .reduce((s, c) => s + Number(c.totalPayout), 0);

  const totalPaid = commissions
    .filter((c) => c.isPaid)
    .reduce((s, c) => s + Number(c.totalPayout), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Agent payouts linked to paid invoices</p>
        </div>
        <CommissionActions agents={agents} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 opacity-80">Pending Payouts</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-1">{formatAED(totalPending)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 opacity-80">Total Paid Out</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">{formatAED(totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 opacity-80">Total Records</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums mt-1">{commissions.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Base (ex-VAT)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">VAT on Comm</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Payout</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {commissions.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    No commissions yet. Assign an agent when creating an invoice.
                  </td>
                </tr>
              )}
              {commissions.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.agent.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${
                      c.agent.isInternal
                        ? "bg-blue-50 text-blue-700 ring-blue-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100"
                    }`}>
                      {c.agent.isInternal ? "Internal" : "External"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs">{c.invoice.number}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{c.invoice.customer.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAED(Number(c.baseAmount))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(c.rate)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatAED(Number(c.vatOnComm))}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">{formatAED(Number(c.totalPayout))}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${
                      c.isPaid
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100"
                    }`}>
                      {c.isPaid ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!c.isPaid && (
                      <CommissionActions
                        agents={agents}
                        markPaidId={c.id}
                        markPaidAmount={Number(c.totalPayout)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
