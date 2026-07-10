"use client";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { PurchaseEditButton, PurchaseViewButton, PurchaseStatusButton } from "@/app/(dashboard)/purchases/PurchaseActions";

type PurchaseOrder = {
  id: string;
  number: string;
  status: string;
  totalAed: number;
  subtotalAed: number;
  inputVat: number;
  customsDuty: number;
  isRcm: boolean;
  orderDate: Date | string;
  supplier: { name: string };
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    RECEIVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function TaxModeBadge({ isRcm }: { isRcm: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${isRcm ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"}`}>
      {isRcm ? "RCM" : "Standard"}
    </span>
  );
}

const PAGE_SIZE = 10;

export function PurchaseTable({ orders }: { orders: PurchaseOrder[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = orders.filter((po) => {
    const q = search.toLowerCase();
    return (
      po.number.toLowerCase().includes(q) ||
      po.supplier.name.toLowerCase().includes(q) ||
      po.status.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Purchase register</h2>
          <p className="mt-0.5 text-sm text-slate-500">{filtered.length} of {orders.length} orders</p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO, supplier…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["PO", "Supplier", "Date", "Subtotal", "Input VAT", "Customs", "Total", "Tax Mode", "Status", "Actions"].map((h) => (
                <th key={h} className={`px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={10} className="px-6 py-10 text-center text-sm text-slate-400">No purchase orders found</td></tr>
            )}
            {slice.map((po) => (
              <tr key={po.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                <td className="px-5 py-4 font-mono text-sm font-semibold text-sky-700">{po.number}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-800">{po.supplier.name}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{new Date(po.orderDate).toLocaleDateString("en-AE")}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(po.subtotalAed)}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(po.inputVat)}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(po.customsDuty)}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(po.totalAed)}</td>
                <td className="px-5 py-4"><TaxModeBadge isRcm={po.isRcm} /></td>
                <td className="px-5 py-4"><StatusBadge status={po.status} /></td>
                <td className="px-5 py-4 text-right">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-500">Page {safePage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${safePage === p ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
