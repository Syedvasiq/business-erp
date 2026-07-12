"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { SalesStatusButton, EditInvoiceButton } from "@/app/(dashboard)/sales/SalesActions";

type Invoice = {
  id: string;
  number: string;
  status: string;
  totalAed: number;
  paidAmount: number;
  issueDate: Date | string;
  emirate: string | null;
  customer: { name: string };
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    ISSUED: "bg-sky-50 text-sky-700 ring-sky-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700 ring-amber-100",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

const PAGE_SIZE = 10;

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      inv.number.toLowerCase().includes(q) ||
      inv.customer.name.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q) ||
      (inv.emirate ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Invoice register</h2>
          <p className="mt-0.5 text-sm text-slate-500">{filtered.length} of {invoices.length} invoices</p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice, customer…"
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
              {["Invoice", "Customer", "Date", "Status", "Total", "Balance Due", "Action"].map((h) => (
                <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No invoices found</td></tr>
            )}
            {slice.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link href={`/sales/${inv.id}/invoice`} className="font-mono text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline">
                    {inv.number}
                  </Link>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-800">{inv.customer.name}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{new Date(inv.issueDate).toLocaleDateString("en-AE")}</td>
                <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(inv.totalAed)}</td>
                <td className="px-5 py-4 text-sm font-semibold tabular-nums">
                  {inv.status === "PAID" ? (
                    <span className="text-emerald-600">—</span>
                  ) : inv.status === "CANCELLED" ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className={inv.paidAmount > 0 ? "text-amber-600" : "text-rose-600"}>
                      {formatAED(Math.max(0, inv.totalAed - inv.paidAmount))}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {inv.status !== "CANCELLED" && <EditInvoiceButton invoiceId={inv.id} />}
                    <SalesStatusButton invoiceId={inv.id} currentStatus={inv.status} invoiceTotal={inv.totalAed} />
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
