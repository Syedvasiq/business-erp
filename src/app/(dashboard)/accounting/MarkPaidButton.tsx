"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle, Loader2 } from "lucide-react";
import { formatAED } from "@/lib/utils";

type PaymentForm = {
  paymentType: string;
  method: string;
  amount: string;
  date: string;
  bankName: string;
  transactionId: string;
  chequeNumber: string;
  chequeDate: string;
  chequeBank: string;
  notes: string;
};

export function MarkPaidButton({
  invoiceId,
  invoiceTotal,
  purchaseOrderId,
  poTotal,
  paidSoFar = 0,
  label = "Mark Paid",
}: {
  invoiceId?: string;
  invoiceTotal?: number;
  purchaseOrderId?: string;
  poTotal?: number;
  paidSoFar?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const total = invoiceTotal ?? poTotal ?? 0;
  const balance = Math.max(0, total - paidSoFar);

  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<PaymentForm>({
    defaultValues: {
      paymentType: "FULL",
      method: "CASH",
      amount: balance > 0 ? balance.toFixed(2) : total.toFixed(2),
      date: new Date().toISOString().slice(0, 10),
      bankName: "", transactionId: "", chequeNumber: "", chequeDate: "", chequeBank: "", notes: "",
    },
  });

  const method = watch("method");
  const paymentType = watch("paymentType");
  const amountVal = Number(watch("amount") || 0);

  const onSubmit = async (data: PaymentForm) => {
    const isPartial = data.paymentType === "PARTIAL";
    const paymentPayload = {
      method:        data.method,
      amount:        Number(data.amount),
      date:          data.date,
      bankName:      data.bankName      || null,
      transactionId: data.transactionId || null,
      chequeNumber:  data.chequeNumber  || null,
      chequeDate:    data.chequeDate    || null,
      chequeBank:    data.chequeBank    || null,
      notes:         data.notes         || null,
    };

    if (invoiceId) {
      await fetch(`/api/sales/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isPartial ? "PARTIALLY_PAID" : "PAID",
          payment: paymentPayload,
        }),
      });
    } else if (purchaseOrderId) {
      // PO: API determines PAID vs PARTIALLY_PAID based on cumulative payments
      await fetch(`/api/purchases/${purchaseOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment: paymentPayload }),
      });
    }
    reset();
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        <CheckCircle size={12} />
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="" className="max-w-lg">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Record Payment</h2>
            <p className="mt-1 text-sm text-slate-500">Enter payment details — saved to ledger and payment history.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5 sm:px-6">

            {/* Balance summary */}
            {total > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-semibold text-slate-800">{formatAED(total)}</span>
                </div>
                {paidSoFar > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Already paid</span>
                    <span className="font-medium text-emerald-600">{formatAED(paidSoFar)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="font-semibold text-slate-700">Balance due</span>
                  <span className="font-semibold text-rose-600">{formatAED(balance)}</span>
                </div>
              </div>
            )}

            {/* Full / Partial toggle */}
            <div className="grid grid-cols-2 gap-3">
              {([{ v: "FULL", label: "Fully Paid" }, { v: "PARTIAL", label: "Partially Paid" }] as const).map((opt) => (
                <label key={opt.v}
                  className={`flex cursor-pointer items-center justify-center rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                    paymentType === opt.v
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}>
                  <input type="radio" className="sr-only" value={opt.v} {...register("paymentType")} />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Method pills */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Payment Method</p>
              <div className="grid grid-cols-5 gap-2">
                {([
                  { v: "CASH",          label: "Cash" },
                  { v: "BANK_TRANSFER", label: "Bank Transfer" },
                  { v: "CHEQUE",        label: "Cheque" },
                  { v: "ONLINE",        label: "Online" },
                  { v: "CARD",          label: "Card" },
                ] as const).map((m) => (
                  <label key={m.v}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border-2 px-2 py-2.5 text-center text-xs font-semibold transition ${
                      method === m.v ? "border-sky-600 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}>
                    <input type="radio" className="sr-only" value={m.v} {...register("method")} />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input label="Amount (AED) *" type="text" inputMode="decimal"
                  {...register("amount", { required: true })} />
                {paymentType === "PARTIAL" && amountVal > 0 && balance > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Remaining after: {formatAED(Math.max(0, balance - amountVal))}
                  </p>
                )}
              </div>
              <Input label="Payment Date *" type="date" {...register("date", { required: true })} />
            </div>

            {method === "BANK_TRANSFER" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Bank Transfer Details</p>
                <Input label="Bank Name *" placeholder="e.g. Emirates NBD" {...register("bankName")} />
                <Input label="Transaction / Reference ID *" placeholder="TXN123456" {...register("transactionId")} />
              </div>
            )}
            {method === "ONLINE" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Online Payment Details</p>
                <Input label="Transaction ID *" placeholder="e.g. PAY-ABC123" {...register("transactionId")} />
                <Input label="Platform / Gateway" placeholder="e.g. Stripe, PayTabs, Network" {...register("bankName")} />
              </div>
            )}
            {method === "CARD" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Card Payment Details</p>
                <Input label="Approval / Transaction Code" placeholder="e.g. 123456" {...register("transactionId")} />
                <Input label="Bank / Terminal" placeholder="e.g. FAB POS Terminal" {...register("bankName")} />
              </div>
            )}
            {method === "CHEQUE" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cheque Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Cheque Number *" placeholder="e.g. 001234" {...register("chequeNumber")} />
                  <Input label="Cheque Date *" type="date" {...register("chequeDate")} />
                </div>
                <Input label="Issuing Bank *" placeholder="e.g. ADCB" {...register("chequeBank")} />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes <span className="text-slate-400">(optional)</span></label>
              <textarea rows={2} placeholder="Any additional payment notes..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                {...register("notes")} />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="min-h-[44px] rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Saving..." : "Save Payment"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
