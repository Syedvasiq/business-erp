import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Hash,
  ReceiptText, Wallet, AlertCircle, TrendingUp, ExternalLink,
} from "lucide-react";

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, sub, icon, tone = "default" }: {
  title: string; value: string; sub?: string; icon: React.ReactNode;
  tone?: "default" | "blue" | "emerald" | "amber" | "violet" | "rose";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    blue: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    ISSUED: "bg-sky-50 text-sky-700 ring-sky-100",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700 ring-amber-100",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
    DRAFT: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        include: { lines: { include: { item: true } } },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!customer) notFound();

  // fetch assigned user name
  const assignedUser = customer.assignedUserId
    ? await prisma.user.findUnique({ where: { id: customer.assignedUserId }, select: { name: true } })
    : null;

  const totalRevenue = customer.invoices.reduce((s, i) => s + Number(i.totalAed), 0);
  const totalVat = customer.invoices.reduce((s, i) => s + Number(i.vatAmount), 0);
  const outstanding = customer.invoices
    .filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID")
    .reduce((s, i) => s + Number(i.totalAed), 0);
  const paidCount = customer.invoices.filter((i) => i.status === "PAID").length;
  const totalQtyOrdered = customer.invoices.flatMap((i) => i.lines).reduce((s, l) => s + Number(l.qty), 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">

        {/* Header */}
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link href="/customers" className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Customer profile</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{customer.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  {customer.email && <span className="flex items-center gap-1.5"><Mail size={13} />{customer.email}</span>}
                  {customer.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{customer.phone}</span>}
                  {customer.emirate && <span className="flex items-center gap-1.5"><MapPin size={13} />{customer.emirate}</span>}
                  {customer.trn && <span className="flex items-center gap-1.5"><Hash size={13} />TRN: {customer.trn}</span>}
                </div>
              </div>
            </div>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${customer.isB2B ? "bg-sky-50 text-sky-700 ring-sky-100" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                {customer.isB2B ? "B2B" : "B2C"}
              </span>
              {assignedUser && (
                <span className="inline-flex rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                  Assigned: {assignedUser.name}
                </span>
              )}
              {customer.address && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  <MapPin size={11} />{customer.address}
                </span>
              )}
            </div>
          </div>
        </SurfaceCard>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total invoices" value={String(customer.invoices.length)} sub={`${paidCount} paid`} icon={<ReceiptText size={20} />} tone="blue" />
          <StatCard title="Total revenue" value={formatAED(totalRevenue)} sub="All invoices incl. VAT" icon={<Wallet size={20} />} tone="emerald" />
          <StatCard title="VAT collected" value={formatAED(totalVat)} sub="Output VAT total" icon={<TrendingUp size={20} />} tone="violet" />
          <StatCard title="Outstanding" value={formatAED(outstanding)} sub="Issued + partially paid" icon={<AlertCircle size={20} />} tone={outstanding > 0 ? "amber" : "emerald"} />
          <StatCard title="Total qty ordered" value={totalQtyOrdered.toFixed(2)} sub="Across all line items" icon={<User size={20} />} tone="default" />
        </section>

        {/* Invoice table */}
        <SurfaceCard className="hidden overflow-hidden lg:block">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Invoice history</h2>
            <p className="mt-1 text-sm text-slate-500">{customer.invoices.length} invoices</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200">
                  {["Invoice #", "Date", "Due Date", "Items", "Subtotal", "VAT", "Total", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-sky-700">{inv.number}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(inv.issueDate).toLocaleDateString("en-AE")}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-AE") : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-0.5">
                        {inv.lines.map((l) => (
                          <p key={l.id} className="text-xs text-slate-500">
                            {l.item.name} × {Number(l.qty).toFixed(2)} {l.item.uom}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(Number(inv.subtotalAed))}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(Number(inv.vatAmount))}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                      {formatAED(Number(inv.totalAed))}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/sales/${inv.id}/invoice`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                        <ExternalLink size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
                {customer.invoices.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No invoices yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        {/* Mobile invoice cards */}
        <div className="space-y-4 lg:hidden">
          <h2 className="px-1 text-base font-semibold text-slate-900">Invoice history</h2>
          {customer.invoices.length === 0 && (
            <p className="px-1 text-sm text-slate-400">No invoices yet</p>
          )}
          {customer.invoices.map((inv) => (
            <SurfaceCard key={inv.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-sky-700">{inv.number}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(inv.issueDate).toLocaleDateString("en-AE")}</p>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              <div className="mt-3 space-y-1">
                {inv.lines.map((l) => (
                  <p key={l.id} className="text-xs text-slate-500">{l.item.name} × {Number(l.qty).toFixed(2)} {l.item.uom}</p>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                <div><p className="text-[10px] font-semibold uppercase text-slate-400">Subtotal</p><p className="text-sm font-medium text-slate-700">{formatAED(Number(inv.subtotalAed))}</p></div>
                <div><p className="text-[10px] font-semibold uppercase text-slate-400">VAT</p><p className="text-sm font-medium text-slate-700">{formatAED(Number(inv.vatAmount))}</p></div>
                <div><p className="text-[10px] font-semibold uppercase text-slate-400">Total</p><p className="text-sm font-semibold text-slate-900">{formatAED(Number(inv.totalAed))}</p></div>
              </div>
              <div className="mt-3 flex justify-end">
                <Link href={`/sales/${inv.id}/invoice`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                  <ExternalLink size={12} /> View Invoice
                </Link>
              </div>
            </SurfaceCard>
          ))}
        </div>

      </div>
    </main>
  );
}
