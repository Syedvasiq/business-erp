import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { SupplierActions, SupplierEditButton } from "./SupplierActions";
import {
  Truck,
  Building2,
  Globe2,
  Wallet,
  ChevronRight,
  ReceiptText,
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

function VendorTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    MAINLAND: "bg-sky-50 text-sky-700 ring-sky-100",
    FREE_ZONE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    INTERNATIONAL: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  const labelMap: Record<string, string> = {
    MAINLAND: "Mainland",
    FREE_ZONE: "Free Zone",
    INTERNATIONAL: "International",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        map[type] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {labelMap[type] ?? type}
    </span>
  );
}

function VatBadge({ isRcm }: { isRcm: boolean }) {
  return isRcm ? (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
      RCM
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
      Standard VAT
    </span>
  );
}

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: { purchaseOrders: { select: { totalAed: true } } },
    orderBy: { createdAt: "desc" },
  });

  const mappedSuppliers = suppliers.map((s) => {
    const totalPayables = s.purchaseOrders.reduce(
      (sum, po) => sum + Number(po.totalAed),
      0
    );

    const isRcm = s.vendorType !== "MAINLAND";

    return {
      ...s,
      totalPayables,
      isRcm,
    };
  });

  const totalSuppliers = mappedSuppliers.length;
  const mainlandCount = mappedSuppliers.filter((s) => s.vendorType === "MAINLAND").length;
  const internationalCount = mappedSuppliers.filter(
    (s) => s.vendorType === "INTERNATIONAL"
  ).length;
  const totalPayablesAll = mappedSuppliers.reduce(
    (sum, s) => sum + s.totalPayables,
    0
  );
  const rcmCount = mappedSuppliers.filter((s) => s.isRcm).length;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Header */}
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Supplier management
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Suppliers
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track vendor types, tax treatment, currencies, and total purchase exposure.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <SupplierActions />
            </div>
          </div>
        </SurfaceCard>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total suppliers"
            value={String(totalSuppliers)}
            sub="Registered vendors"
            icon={<Truck size={20} />}
            tone="blue"
          />
          <StatCard
            title="Mainland vendors"
            value={String(mainlandCount)}
            sub={`${totalSuppliers - mainlandCount} non-mainland`}
            icon={<Building2 size={20} />}
            tone="default"
          />
          <StatCard
            title="Total payables"
            value={formatAED(totalPayablesAll)}
            sub="Across purchase orders"
            icon={<Wallet size={20} />}
            tone="emerald"
          />
          <StatCard
            title="RCM suppliers"
            value={String(rcmCount)}
            sub={`${internationalCount} international`}
            icon={<Globe2 size={20} />}
            tone="amber"
          />
        </section>

        {/* Desktop table */}
        <SurfaceCard className="hidden overflow-hidden lg:block">
          <div className="border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Supplier directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {totalSuppliers} suppliers registered
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    TRN
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Currency
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Tax rule
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Total payables
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {mappedSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{supplier.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {supplier.purchaseOrders.length} purchase orders
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {supplier.trn ?? "—"}
                    </td>

                    <td className="px-6 py-4">
                      <VendorTypeBadge type={supplier.vendorType} />
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {supplier.currency}
                    </td>

                    <td className="px-6 py-4">
                      <VatBadge isRcm={supplier.isRcm} />
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                      {formatAED(supplier.totalPayables)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <SupplierEditButton
                        supplierId={supplier.id}
                        name={supplier.name}
                        email={supplier.email}
                        phone={supplier.phone}
                        trn={supplier.trn}
                        vendorType={supplier.vendorType}
                        currency={supplier.currency}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          <div className="px-1">
            <h2 className="text-base font-semibold text-slate-900">
              Supplier directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {totalSuppliers} suppliers registered
            </p>
          </div>

          {mappedSuppliers.map((supplier) => (
            <SurfaceCard key={supplier.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">
                    {supplier.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {supplier.purchaseOrders.length} purchase orders
                  </p>
                </div>

                <VendorTypeBadge type={supplier.vendorType} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    TRN
                  </p>
                  <p className="mt-1 break-words text-sm font-medium text-slate-700">
                    {supplier.trn ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Currency
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {supplier.currency}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Tax rule
                  </p>
                  <div className="mt-1">
                    <VatBadge isRcm={supplier.isRcm} />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Payables
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                    {formatAED(supplier.totalPayables)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <ReceiptText size={14} />
                  Vendor summary
                </div>
                <SupplierEditButton
                  supplierId={supplier.id}
                  name={supplier.name}
                  email={supplier.email}
                  phone={supplier.phone}
                  trn={supplier.trn}
                  vendorType={supplier.vendorType}
                  currency={supplier.currency}
                />
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </main>
  );
}