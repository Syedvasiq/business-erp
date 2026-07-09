"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { UAE_EMIRATES, VAT_RATE, formatAED } from "@/lib/utils";
import { Plus, Trash2, ReceiptText, Loader2 } from "lucide-react";

type LineItem = {
  itemId: string;
  qty: string;
  unitPrice: string;
  discountPct: string;
};

type FormData = {
  customerId: string;
  currency: string;
  exchangeRate: string;
  emirate: string;
  isSimplified: string;
  dueDate: string;
  lines: LineItem[];
};

export function SalesActions() {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      customerId: "",
      currency: "AED",
      exchangeRate: "1",
      emirate: "",
      isSimplified: "false",
      dueDate: "",
      lines: [{ itemId: "", qty: "1", unitPrice: "", discountPct: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");
  const watchedCurrency = watch("currency");

  // Auto-fill unit price when item is selected
  const handleItemChange = (i: number, itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (item) setValue(`lines.${i}.unitPrice`, Number(item.retailPrice).toFixed(2));
  };

  useEffect(() => {
    if (open) {
      fetch("/api/customers").then((r) => r.json()).then(setCustomers);
      fetch("/api/inventory").then((r) => r.json()).then(setItems);
    }
  }, [open]);

  // Auto-fetch live rate when currency changes
  useEffect(() => {
    if (!open) return;
    if (watchedCurrency === "AED") {
      setValue("exchangeRate", "1");
      return;
    }
    fetch(`/api/exchange-rates?currency=${watchedCurrency}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.rate) setValue("exchangeRate", Number(data.rate).toFixed(2));
      })
      .catch(() => {});
  }, [watchedCurrency, open]);

  const calcTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let vat = 0;

    watchedLines.forEach((line) => {
      const item = items.find((i) => i.id === line.itemId);
      const gross = Number(line.qty || 0) * Number(line.unitPrice || 0);
      const disc = gross * (Number(line.discountPct || 0) / 100);
      const net = gross - disc;
      subtotal += net;
      totalDiscount += disc;
      if (item?.taxType === "STANDARD") vat += net * VAT_RATE;
    });

    return { subtotal, totalDiscount, vat, total: subtotal + vat };
  };

  const { subtotal, totalDiscount, vat, total } = calcTotals();

  const closeModal = () => {
    setError("");
    reset({
      customerId: "",
      currency: "AED",
      exchangeRate: "1",
      emirate: "",
      isSimplified: "false",
      dueDate: "",
      lines: [{ itemId: "", qty: "1", unitPrice: "", discountPct: "0" }],
    });
    setOpen(false);
  };

  const onSubmit = async (data: FormData) => {
    setError("");
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        isSimplified: data.isSimplified === "true",
        exchangeRate: Number(data.exchangeRate),
        lines: data.lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          discountPct: Number(line.discountPct || 0),
        })),
      }),
    });

    if (res.ok) {
      closeModal();
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to create invoice.");
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus size={16} />
        New Invoice
      </Button>

      <Modal open={open} onClose={closeModal} title="" className="max-w-4xl">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ReceiptText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Create Tax Invoice
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add customer details, invoice settings, and line items.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Customer details
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label="Customer *"
                    options={[
                      { value: "", label: "Select customer…" },
                      ...customers.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    {...register("customerId", { required: true })}
                  />

                  <Select
                    label="Emirate"
                    options={[
                      { value: "", label: "Select emirate…" },
                      ...UAE_EMIRATES.map((e) => ({ value: e, label: e })),
                    ]}
                    {...register("emirate")}
                  />
                </div>


              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Invoice settings
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Select
                    label="Currency"
                    options={["AED", "USD", "EUR", "GBP", "SAR"].map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    {...register("currency")}
                  />

                  <Input
                    label="Exchange Rate"
                    type="number"
                    step="0.01"
                    placeholder="1"
                    {...register("exchangeRate")}
                  />

                  <Select
                    label="Invoice Type"
                    options={[
                      { value: "false", label: "Tax Invoice" },
                      { value: "true", label: "Simplified Tax Invoice" },
                    ]}
                    {...register("isSimplified")}
                  />
                </div>

                <div className="mt-4">
                  <Input label="Due Date" type="date" {...register("dueDate")} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Line items
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add products, quantities, and pricing for this invoice.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => append({ itemId: "", qty: "1", unitPrice: "", discountPct: "0" })}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus size={14} />
                    Add Line
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_0.6fr_0.8fr_0.6fr_auto] md:items-end">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Item</label>
                          <select
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.itemId`)}
                            onChange={(e) => {
                              register(`lines.${i}.itemId`).onChange(e);
                              handleItemChange(i, e.target.value);
                            }}
                          >
                            <option value="">Select item…</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Qty</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.qty`)}
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.unitPrice`)}
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Disc %</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.discountPct`)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove line item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Line subtotal preview */}
                      {watchedLines[i]?.unitPrice && (
                        <div className="mt-2 text-right text-xs text-slate-400">
                          {(() => {
                            const gross = Number(watchedLines[i].qty || 0) * Number(watchedLines[i].unitPrice || 0);
                            const disc = gross * (Number(watchedLines[i].discountPct || 0) / 100);
                            return `${formatAED(gross)}${disc > 0 ? ` − ${formatAED(disc)} = ${formatAED(gross - disc)}` : ""}`;
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Totals
                </p>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Subtotal (excl. VAT)</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(subtotal + totalDiscount)}
                    </span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Discount</span>
                      <span className="font-medium text-red-500 [font-variant-numeric:tabular-nums]">
                        − {formatAED(totalDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Net (excl. VAT)</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">VAT 5%</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(vat)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span className="text-base font-semibold text-slate-900">Total AED</span>
                    <span className="text-base font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                      {formatAED(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
              {error && (
                <p className="flex-1 text-sm font-medium text-red-600">{error}</p>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                className="min-h-[44px] rounded-2xl"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Posting..." : "Issue Invoice"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}