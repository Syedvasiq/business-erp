import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { SalesActions, SalesStatusButton, EditInvoiceButton } from "./SalesActions";
import { InvoiceTable } from "@/components/InvoiceTable";
import Link from "next/link";
import {
  FileText,
  Wallet,
  ReceiptText,
  Clock3,
} from "lucide-react";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "default" | "blue" | "emerald" | "amber" | "violet";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    blue: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">
            {value}
          </p>
          {sub ? <p className="mt-1 text-sm text-slate-500">{sub}</p> : null}
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </SurfaceCard>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    ISSUED: "bg-sky-50 text-sky-700 ring-sky-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700 ring-amber-100",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
  };

  const label = status.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

export default async function SalesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { customer: true },
    orderBy: { id: "desc" },
  });

  const mappedInvoices = invoices.map((inv) => ({
    ...inv,
    exchangeRate: Number(inv.exchangeRate),
    subtotalAed: Number(inv.subtotalAed),
    vatAmount: Number(inv.vatAmount),
    totalAed: Number(inv.totalAed),
  }));

  const totalInvoices = mappedInvoices.length;
  const paidCount = mappedInvoices.filter((inv) => inv.status === "PAID").length;
  const issuedCount = mappedInvoices.filter((inv) => inv.status === "ISSUED").length;
  const totalRevenue = mappedInvoices.reduce((sum, inv) => sum + inv.totalAed, 0);
  const totalVat = mappedInvoices.reduce((sum, inv) => sum + inv.vatAmount, 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Sales management
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Sales Invoices
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review issued invoices, track VAT, and monitor payment status across all customers.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <SalesActions />
            </div>
          </div>
        </SurfaceCard>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total invoices"
            value={String(totalInvoices)}
            sub="All recorded invoices"
            icon={<FileText size={20} />}
            tone="blue"
          />
          <StatCard
            title="Paid invoices"
            value={String(paidCount)}
            sub={`${issuedCount} currently issued`}
            icon={<Wallet size={20} />}
            tone="emerald"
          />
          <StatCard
            title="Total revenue"
            value={formatAED(totalRevenue)}
            sub="Gross invoice value"
            icon={<ReceiptText size={20} />}
            tone="violet"
          />
          <StatCard
            title="VAT collected"
            value={formatAED(totalVat)}
            sub="Based on invoice totals"
            icon={<Clock3 size={20} />}
            tone="amber"
          />
        </section>

        <SurfaceCard className="hidden overflow-hidden lg:block">
          <InvoiceTable invoices={mappedInvoices} />
        </SurfaceCard>

        <div className="grid grid-cols-1 gap-4 lg:hidden">
          <div className="px-1">
            <h2 className="text-base font-semibold text-slate-900">Invoice register</h2>
            <p className="mt-1 text-sm text-slate-500">{totalInvoices} invoices</p>
          </div>

          {mappedInvoices.map((inv) => (
            <SurfaceCard key={inv.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-sky-700">{inv.number}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {inv.customer.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(inv.issueDate).toLocaleDateString("en-AE")}
                    {inv.emirate ? ` • ${inv.emirate}` : ""}
                  </p>
                </div>

                <StatusBadge status={inv.status} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status={inv.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Subtotal
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(inv.subtotalAed)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    VAT
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(inv.vatAmount)}
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl bg-slate-900 px-4 py-3 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                    Total AED
                  </p>
                  <p className="mt-1 text-lg font-semibold [font-variant-numeric:tabular-nums]">
                    {formatAED(inv.totalAed)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <StatusBadge status={inv.status} />
                <div className="flex items-center gap-2">
                  <Link
                    href={`/sales/${inv.id}/invoice`}
                    className="font-mono text-sm font-semibold text-sky-700 hover:underline"
                  >
                    {inv.number}
                  </Link>
                  {inv.status !== "CANCELLED" && (
                    <EditInvoiceButton invoiceId={inv.id} />
                  )}
                  <SalesStatusButton invoiceId={inv.id} currentStatus={inv.status} invoiceTotal={inv.totalAed} />
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </main>
  );
}