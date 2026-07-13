"use client";

import { useEffect, useState } from "react";
import { formatAED } from "@/lib/utils";
import { ArrowUpCircle, Eye, Loader2, X } from "lucide-react";
import Link from "next/link";
import { ExportButton } from "@/components/ExportButton";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    CASH: "bg-emerald-50 text-emerald-700",
    BANK_TRANSFER: "bg-sky-50 text-sky-700",
    CHEQUE: "bg-amber-50 text-amber-700",
    ONLINE: "bg-violet-50 text-violet-700",
    CARD: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[method] ?? "bg-slate-100 text-slate-600"}`}>
      {method.replace("_", " ")}
    </span>
  );
}

function DetailModal({ payment, onClose }: { payment: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Payment Detail</h2>
            <p className="text-sm text-slate-500">{payment.purchaseOrder?.number} · {payment.purchaseOrder?.supplier?.name}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-3 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["PO Number",  payment.purchaseOrder?.number],
              ["Supplier",   payment.purchaseOrder?.supplier?.name],
              ["Date",       new Date(payment.date).toLocaleDateString("en-AE")],
              ["Method",     payment.method?.replace("_", " ")],
              ["Amount",     formatAED(Number(payment.amount))],
              ["Bank",       payment.bankName || "—"],
              ["Txn ID",     payment.transactionId || "—"],
              ["Cheque #",   payment.chequeNumber || "—"],
              ["Notes",      payment.notes || "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center">
            <p className="text-xs text-rose-600 font-medium">Amount Paid</p>
            <p className="text-2xl font-bold text-rose-700 tabular-nums">{formatAED(Number(payment.amount))}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsMadePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch("/api/finance/payments-made")
      .then((r) => r.json())
      .then((d) => { setPayments(d); setLoading(false); });
  }, []);

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                ←
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Payments Made</h1>
                <p className="mt-0.5 text-sm text-slate-500">{payments.length} payments · Total {formatAED(total)}</p>
              </div>
            </div>
            <ExportButton
              filename="payments-made"
              pdfTitle="Payments Made"
              disabled={loading || payments.length === 0}
              csvRows={payments.map((p) => ({
                Date: new Date(p.date).toLocaleDateString("en-AE"),
                Supplier: p.purchaseOrder?.supplier?.name ?? "",
                "PO Number": p.purchaseOrder?.number ?? "",
                Method: p.method,
                "Bank / Ref": p.bankName || p.transactionId || p.chequeNumber || "",
                Amount: Number(p.amount),
              }))}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Paid Out", value: formatAED(total), color: "bg-rose-50 text-rose-700" },
            { label: "No. of Payments", value: String(payments.length), color: "bg-sky-50 text-sky-700" },
            { label: "Unique Suppliers", value: String(new Set(payments.map((p) => p.purchaseOrder?.supplierId)).size), color: "bg-amber-50 text-amber-700" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-5">
              <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${color} mb-2`}>
                <ArrowUpCircle size={13} /> {label}
              </div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">All Payments Made</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["Date", "Supplier", "PO Number", "Method", "Bank / Ref", "Amount", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No payments made yet</td></tr>
                  )}
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString("en-AE")}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">
                        <Link href={`/finance/suppliers/${p.purchaseOrder?.supplierId}`} className="hover:text-sky-700 hover:underline">
                          {p.purchaseOrder?.supplier?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-sky-700">
                        {p.purchaseOrder?.number ?? "—"}
                      </td>
                      <td className="px-5 py-4"><MethodBadge method={p.method} /></td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {p.bankName || p.transactionId || p.chequeNumber || "—"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-rose-600 tabular-nums">
                        {formatAED(Number(p.amount))}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => setSelected(p)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-sky-50 hover:text-sky-700">
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>

      {selected && <DetailModal payment={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
