import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { AllocateActions } from "./AllocateActions";
import { ArrowLeft, Users, Package } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export default async function AllocationsPage() {
  const [items, users, allocations] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { isActive: true, role: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.stockAllocation.findMany({
      include: { item: { select: { name: true, sku: true, weightedAvgCost: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const userMap = Object.fromEntries(
    await prisma.user.findMany({ select: { id: true, name: true, role: true } })
      .then((u) => u.map((u) => [u.id, u]))
  );

  // Master stock summary per item — total allocated vs available
  const allocatedByItem: Record<string, number> = {};
  for (const a of allocations) {
    allocatedByItem[a.itemId] = (allocatedByItem[a.itemId] ?? 0) + Number(a.allocatedQty);
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

        {/* Header */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/inventory" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2">
                <ArrowLeft size={13} /> Inventory
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Inventory</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Stock Allocations</h1>
              <p className="mt-1 text-sm text-slate-500">Assign stock from master inventory to team members</p>
            </div>
            <AllocateActions items={items} users={users} />
          </div>
        </Card>

        {/* Master stock availability */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <Package size={17} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Master Stock — Available to Allocate</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Item", "SKU", "Total Stock", "Allocated", "Available", "Avg Cost", "Stock Value"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const totalStock = Number(item.stockQty);
                  const allocated = allocatedByItem[item.id] ?? 0;
                  const available = totalStock - allocated;
                  const avgCost = Number(item.weightedAvgCost);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="px-6 py-4 tabular-nums text-slate-700">{totalStock.toFixed(2)}</td>
                      <td className="px-6 py-4 tabular-nums text-amber-600 font-medium">{allocated.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold tabular-nums ${available <= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {available.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 tabular-nums text-slate-600">{formatAED(avgCost)}</td>
                      <td className="px-6 py-4 tabular-nums font-semibold text-slate-900">{formatAED(totalStock * avgCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Member pockets */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <Users size={17} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Member Allocations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Member", "Item", "SKU", "Allocated", "Sold", "Remaining", "Value (Remaining)"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => {
                  const allocated = Number(a.allocatedQty);
                  const sold = Number(a.soldQty);
                  const remaining = allocated - sold;
                  const avgCost = Number(a.item.weightedAvgCost);
                  const user = userMap[a.userId];
                  return (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{user?.name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-400">{user?.role?.replace("_", " ")}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{a.item.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{a.item.sku}</td>
                      <td className="px-6 py-4 tabular-nums text-slate-700">{allocated.toFixed(2)}</td>
                      <td className="px-6 py-4 tabular-nums text-sky-600 font-medium">{sold.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold tabular-nums ${remaining <= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {remaining.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 tabular-nums font-semibold text-slate-900">{formatAED(remaining * avgCost)}</td>
                    </tr>
                  );
                })}
                {allocations.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No allocations yet — assign stock to a member to get started</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </main>
  );
}
