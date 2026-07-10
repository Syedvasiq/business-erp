import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { InventoryActions, InventoryEditButton } from "./InventoryActions";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  Wallet,
  Tags,
  ChevronRight,
  Boxes,
  Users,
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

function TaxBadge({ taxType }: { taxType: string }) {
  const styles: Record<string, string> = {
    STANDARD: "bg-sky-50 text-sky-700 ring-sky-100",
    ZERO_RATED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    EXEMPT: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  const labels: Record<string, string> = {
    STANDARD: "5% VAT",
    ZERO_RATED: "0% Zero",
    EXEMPT: "Exempt",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        styles[taxType] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {labels[taxType] ?? taxType}
    </span>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty < 5) {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
      In stock
    </span>
  );
}

export default async function InventoryPage() {
  const items = await prisma.item.findMany({
    orderBy: { name: "asc" },
    include: { supplier: { select: { id: true, name: true } } },
  });

  const mappedItems = items.map((item) => {
    const stockQty = Number(item.stockQty);
    const unitCost = Number(item.unitCost);
    const retailPrice = Number(item.retailPrice);
    const avgCost = Number(item.weightedAvgCost);
    const stockValue = stockQty * avgCost;

    return {
      ...item,
      stockQty,
      unitCost,
      retailPrice,
      avgCost,
      stockValue,
    };
  });

  const totalItems = mappedItems.length;
  const lowStockCount = mappedItems.filter((item) => item.stockQty < 5).length;
  const totalStockValue = mappedItems.reduce((sum, item) => sum + item.stockValue, 0);
  const avgRetailValue =
    totalItems > 0
      ? mappedItems.reduce((sum, item) => sum + item.retailPrice, 0) / totalItems
      : 0;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">
        {/* Header */}
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Inventory management
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Inventory
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track items, monitor stock risk, and review pricing and tax classification.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Link href="/inventory/allocations"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 min-h-[44px]">
                <Users size={15} /> Stock Allocations
              </Link>
              <InventoryActions />
            </div>
          </div>
        </SurfaceCard>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total items"
            value={String(totalItems)}
            sub="Active inventory records"
            icon={<Package size={20} />}
            tone="blue"
          />
          <StatCard
            title="Low stock items"
            value={String(lowStockCount)}
            sub={`${totalItems - lowStockCount} healthy stock`}
            icon={<AlertTriangle size={20} />}
            tone="amber"
          />
          <StatCard
            title="Stock value"
            value={formatAED(totalStockValue)}
            sub="Based on weighted avg cost"
            icon={<Wallet size={20} />}
            tone="emerald"
          />
          <StatCard
            title="Avg retail price"
            value={formatAED(avgRetailValue)}
            sub="Average selling price"
            icon={<Tags size={20} />}
            tone="violet"
          />
        </section>

        {/* Desktop table */}
        <SurfaceCard className="hidden overflow-hidden lg:block">
          <div className="border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Item directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {totalItems} inventory items
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Item
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    UOM
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Tax type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Unit cost
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Retail price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Avg cost
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Stock qty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Stock value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {mappedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4 max-w-[180px]">
                      <div className="group relative">
                        <p className="font-semibold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-max max-w-[260px] rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                          {item.name}
                          <div className="absolute left-3 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-slate-900" />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                        {item.sku}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                        {item.uom}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-[140px]">
                      {item.supplier?.name ? (
                        <div className="group relative">
                          <span className="text-sm text-slate-600 truncate block">
                            {item.supplier.name}
                          </span>
                          <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-max max-w-[260px] rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                            {item.supplier.name}
                            <div className="absolute left-3 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-slate-900" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <TaxBadge taxType={item.taxType} />
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(item.unitCost)}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(item.retailPrice)}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(item.avgCost)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                            item.stockQty < 5 ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          {item.stockQty.toFixed(2)}
                        </span>
                        <StockBadge qty={item.stockQty} />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                      {formatAED(item.stockValue)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <InventoryEditButton
                        itemId={item.id}
                        name={item.name}
                        sku={item.sku}
                        barcode={item.barcode}
                        uom={item.uom}
                        unitCost={item.unitCost}
                        retailPrice={item.retailPrice}
                        taxType={item.taxType}
                        supplierId={item.supplierId}
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
              Item directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {totalItems} inventory items
            </p>
          </div>

          {mappedItems.map((item) => (
            <SurfaceCard key={item.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <div className="mt-2 inline-flex rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                    {item.sku}
                  </div>
                  {item.supplier && (
                    <p className="mt-1 text-xs text-slate-500">{item.supplier.name}</p>
                  )}
                </div>

                <TaxBadge taxType={item.taxType} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Unit cost
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(item.unitCost)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Retail price
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(item.retailPrice)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Avg cost
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                    {formatAED(item.avgCost)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Stock value
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                    {formatAED(item.stockValue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                      item.stockQty < 5 ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {item.stockQty.toFixed(2)} qty
                  </span>
                  <StockBadge qty={item.stockQty} />
                </div>

                <InventoryEditButton
                  itemId={item.id}
                  name={item.name}
                  sku={item.sku}
                  barcode={item.barcode}
                  uom={item.uom}
                  unitCost={item.unitCost}
                  retailPrice={item.retailPrice}
                  taxType={item.taxType}
                  supplierId={item.supplierId}
                />
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </main>
  );
}