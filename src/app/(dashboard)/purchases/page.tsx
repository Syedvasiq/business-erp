import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { PurchaseActions, PurchaseStatusButton, PurchaseViewButton, PurchaseEditButton } from "./PurchaseActions";
import {
  ShoppingCart,
  ReceiptText,
  ShieldAlert,
  PackageCheck,
  ChevronRight,
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
    RECEIVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    APPROVED: "bg-blue-50 text-blue-700 ring-blue-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function TaxModeBadge({ isRcm }: { isRcm: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        isRcm
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100"
      }`}
    >
      {isRcm ? "RCM" : "Standard"}
    </span>
  );
}

export default async function PurchasesPage() {
  const orders = await prisma.purchaseOrder.findMany({
    include: { supplier: true },
    orderBy: { orderDate: "desc" },
  });

  const mappedOrders = orders.map((po) => ({
    ...po,
    subtotalAed: Number(po.subtotalAed),
    inputVat: Number(po.inputVat),
    customsDuty: Number(po.customsDuty),
    totalAed: Number(po.totalAed),
  }));

  const totalOrders = mappedOrders.length;
  const receivedCount = mappedOrders.filter((po) => po.status === "RECEIVED").length;
  const totalSpend = mappedOrders.reduce((sum, po) => sum + po.totalAed, 0);
  const totalInputVat = mappedOrders.reduce((sum, po) => sum + po.inputVat, 0);
  const rcmCount = mappedOrders.filter((po) => po.isRcm).length;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Procurement management
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Purchase Orders
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track supplier purchases, VAT inputs, customs duty, and reverse charge orders.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <PurchaseActions />
            </div>
          </div>
        </SurfaceCard>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total orders"
            value={String(totalOrders)}
            sub="All recorded purchase orders"
            icon={<ShoppingCart size={20} />}
            tone="blue"
          />
          <StatCard
            title="Received"
            value={String(receivedCount)}
            sub="Completed purchase receipts"
            icon={<PackageCheck size={20} />}
            tone="emerald"
          />
          <StatCard
            title="Total spend"
            value={formatAED(totalSpend)}
            sub="Gross purchase value"
            icon={<ReceiptText size={20} />}
            tone="violet"
          />
          <StatCard
            title="RCM orders"
            value={String(rcmCount)}
            sub={formatAED(totalInputVat) + " input VAT booked"}
            icon={<ShieldAlert size={20} />}
            tone="amber"
          />
        </section>

        <SurfaceCard className="hidden overflow-hidden lg:block">
          <div className="border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Purchase register</h2>
              <p className="mt-1 text-sm text-slate-500">{totalOrders} purchase orders</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    PO
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Subtotal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Input VAT
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Customs
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Tax mode
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {mappedOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-sky-700">
                        {po.number}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{po.supplier.name}</p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(po.orderDate).toLocaleDateString("en-AE")}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(po.subtotalAed)}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(po.inputVat)}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(po.customsDuty)}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                      {formatAED(po.totalAed)}
                    </td>

                    <td className="px-6 py-4">
                      <TaxModeBadge isRcm={po.isRcm} />
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={po.status} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <PurchaseEditButton purchaseId={po.id} />
                        <PurchaseViewButton purchaseId={po.id} />
                        <PurchaseStatusButton purchaseId={po.id} currentStatus={po.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <div className="grid grid-cols-1 gap-4 lg:hidden">
          <div className="px-1">
            <h2 className="text-base font-semibold text-slate-900">Purchase register</h2>
            <p className="mt-1 text-sm text-slate-500">{totalOrders} purchase orders</p>
          </div>

          {mappedOrders.map((po) => (
            <SurfaceCard key={po.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-sky-700">{po.number}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {po.supplier.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(po.orderDate).toLocaleDateString("en-AE")}
                  </p>
                </div>

                <StatusBadge status={po.status} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <TaxModeBadge isRcm={po.isRcm} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Subtotal
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(po.subtotalAed)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Input VAT
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(po.inputVat)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Customs
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(po.customsDuty)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                    Total AED
                  </p>
                  <p className="mt-1 text-lg font-semibold [font-variant-numeric:tabular-nums]">
                    {formatAED(po.totalAed)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <StatusBadge status={po.status} />
                <div className="flex items-center gap-1.5">
                  <PurchaseEditButton purchaseId={po.id} />
                  <PurchaseViewButton purchaseId={po.id} />
                  <PurchaseStatusButton purchaseId={po.id} currentStatus={po.status} />
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </main>
  );
}