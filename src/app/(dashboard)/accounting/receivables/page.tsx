import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, TrendingUp, FileX, DollarSign, Users } from "lucide-react";
import { CreditNoteButton } from "../CreditNoteButton";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, sub, icon, tone }: {
  title: string; value: string; sub?: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    blue: "bg-sky-50 text-sky-700", emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ISSUED:         "bg-sky-50 text-sky-700 ring-sky-100",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700 ring-amber-100",
    PAID:           "bg-emerald-50 text-emerald-700 ring-emerald-100",
    DRAFT:          "bg-slate-100 text-slate-600 ring-slate-200",
    CANCELLED:      "bg-rose-50 text-rose-600 ring-rose-100",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default async function ReceivablesPage() {
  const [invoices, creditNotes, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "DRAFT"] } },
      include: { customer: true },
      orderBy: { issueDate: "desc" },
    }),
    prisma.creditNote.findMany({
      where: { type: "CUSTOMER" },
      include: { customer: true },
      orderBy: { date: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalAR = invoices.reduce((s, inv) => s + Number(inv.totalAed), 0);
  const totalCN = creditNotes.reduce((s, cn) => s + Number(cn.amount) + Number(cn.vatAmount), 0);
  const netAR = totalAR - totalCN;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/accounting" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Accounting</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Accounts Receivable</h1>
                <p className="mt-1 text-sm text-slate-500">Outstanding invoices and customer credit notes</p>
              </div>
            </div>
            <CreditNoteButton type="CUSTOMER" customers={customers} />
          </div>
        </Card>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Outstanding invoices" value={String(invoices.length)} sub="Unpaid / partially paid" icon={<TrendingUp size={20} />} tone="blue" />
          <StatCard title="Total AR" value={formatAED(totalAR)} sub="Gross receivable" icon={<DollarSign size={20} />} tone="blue" />
          <StatCard title="Credit notes issued" value={formatAED(totalCN)} sub={`${creditNotes.length} notes`} icon={<FileX size={20} />} tone="rose" />
          <StatCard title="Net receivable" value={formatAED(netAR)} sub="AR minus credit notes" icon={<Users size={20} />} tone="emerald" />
        </section>

        {/* Outstanding Invoices */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Outstanding Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">{invoices.length} unpaid invoices</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Invoice", "Customer", "Date", "Due Date", "Total", "Status"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">No outstanding invoices</td></tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <Link href={`/sales/${inv.id}/invoice`} className="font-mono text-sm font-semibold text-sky-700 hover:underline">{inv.number}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{inv.customer.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(inv.issueDate).toLocaleDateString("en-AE")}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-AE") : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(Number(inv.totalAed))}</td>
                    <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Customer Credit Notes */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Customer Credit Notes</h2>
            <p className="mt-1 text-sm text-slate-500">{creditNotes.length} credit notes issued</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Number", "Customer", "Date", "Amount", "VAT", "Total", "Reason"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creditNotes.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No credit notes yet</td></tr>
                )}
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-rose-600">{cn.number}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{cn.customer?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(cn.date).toLocaleDateString("en-AE")}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(Number(cn.amount))}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(Number(cn.vatAmount))}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(Number(cn.amount) + Number(cn.vatAmount))}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{cn.reason}</td>
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
