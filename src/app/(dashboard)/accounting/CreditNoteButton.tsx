"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useForm } from "react-hook-form";
import { Plus, FileX, Loader2 } from "lucide-react";

type FormData = {
  customerId: string;
  supplierId: string;
  amount: string;
  includeVat: boolean;
  reason: string;
  date: string;
};

export function CreditNoteButton({
  type,
  customers = [],
  suppliers = [],
}: {
  type: "CUSTOMER" | "SUPPLIER";
  customers?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      customerId: "", supplierId: "", amount: "", includeVat: false,
      reason: "", date: new Date().toISOString().slice(0, 10),
    },
  });

  const amount = Number(watch("amount") || 0);
  const includeVat = watch("includeVat");
  const vatPreview = includeVat ? parseFloat((amount * 0.05).toFixed(2)) : 0;

  const onSubmit = async (data: FormData) => {
    await fetch("/api/credit-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        customerId: data.customerId || null,
        supplierId: data.supplierId || null,
        amount: Number(data.amount),
        includeVat: data.includeVat,
        reason: data.reason,
        date: data.date,
      }),
    });
    reset();
    setOpen(false);
    router.refresh();
  };

  const label = type === "CUSTOMER" ? "Customer Credit Note" : "Supplier Debit Note";

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus size={16} />
        {label}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="" className="max-w-lg">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <FileX size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">{label}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {type === "CUSTOMER"
                    ? "Issue a credit to reduce the customer's outstanding balance."
                    : "Raise a debit note to reduce the amount owed to this supplier."}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5 sm:px-6">
            {type === "CUSTOMER" ? (
              <Select
                label="Customer *"
                options={[{ value: "", label: "Select customer..." }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
                {...register("customerId", { required: true })}
              />
            ) : (
              <Select
                label="Supplier *"
                options={[{ value: "", label: "Select supplier..." }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
                {...register("supplierId", { required: true })}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input label="Date *" type="date" {...register("date", { required: true })} />
              <Input label="Amount (AED) *" type="text" inputMode="decimal" placeholder="0.00"
                {...register("amount", { required: true })} />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input type="checkbox" id="includeVat" className="h-4 w-4 rounded" {...register("includeVat")} />
              <label htmlFor="includeVat" className="text-sm font-medium text-slate-700">
                Include VAT (5%)
                {includeVat && amount > 0 && (
                  <span className="ml-2 text-slate-400">+AED {vatPreview.toFixed(2)}</span>
                )}
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason *</label>
              <textarea
                rows={2}
                placeholder="e.g. Returned goods, overcharge correction..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 resize-none"
                {...register("reason", { required: true })}
              />
            </div>

            {amount > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-medium">AED {amount.toFixed(2)}</span></div>
                {includeVat && <div className="flex justify-between"><span className="text-slate-500">VAT (5%)</span><span className="font-medium">AED {vatPreview.toFixed(2)}</span></div>}
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-semibold text-slate-900">AED {(amount + vatPreview).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="min-h-[44px] rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Saving..." : `Issue ${label}`}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
