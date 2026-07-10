"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { formatAED } from "@/lib/utils";
import { Plus, Trash2, ShoppingCart, Loader2, ShieldAlert, ChevronDown } from "lucide-react";

type LineItem = {
  itemId: string;
  qty: string;
  unitCost: string;
};

type FormData = {
  supplierId: string;
  currency: string;
  exchangeRate: string;
  customsDuty: string;
  shippingCost: string;
  lines: LineItem[];
};

export function PurchaseActions() {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [vatRate, setVatRate] = useState(0.05);
  const [lineUoms, setLineUoms] = useState<string[]>([""]);
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
      supplierId: "",
      currency: "AED",
      exchangeRate: "1",
      customsDuty: "0",
      shippingCost: "0",
      lines: [{ itemId: "", qty: "1", unitCost: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");
  const watchedSupplier = watch("supplierId");
  const watchedCustomsDuty = watch("customsDuty");
  const watchedShippingCost = watch("shippingCost");
  const watchedCurrency = watch("currency");

  useEffect(() => {
    if (open) {
      fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
      fetch("/api/inventory").then((r) => r.json()).then(setItems);
      fetch("/api/settings").then((r) => r.json()).then((s) => {
        if (s?.vatRate != null) setVatRate(Number(s.vatRate) / 100);
      });
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

  const selectedSupplier = suppliers.find((s) => s.id === watchedSupplier);
  const isRcm = selectedSupplier?.vendorType !== "MAINLAND";

  const calcTotals = () => {
    let subtotal = 0;

    watchedLines.forEach((line) => {
      subtotal += Number(line.qty || 0) * Number(line.unitCost || 0);
    });

    const customsDuty = Number(watchedCustomsDuty || 0);
    const shippingCost = Number(watchedShippingCost || 0);
    const inputVat = isRcm ? 0 : subtotal * vatRate;
    const total = subtotal + inputVat + customsDuty + shippingCost;

    return { subtotal, inputVat, customsDuty, shippingCost, total };
  };

  const { subtotal, inputVat, customsDuty, shippingCost, total } = calcTotals();

  const closeModal = () => {
    setLineUoms([""]);
    reset({
      supplierId: "",
      currency: "AED",
      exchangeRate: "1",
      customsDuty: "0",
      shippingCost: "0",
      lines: [{ itemId: "", qty: "1", unitCost: "" }],
    });
    setOpen(false);
  };

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        exchangeRate: Number(data.exchangeRate),
        customsDuty: Number(data.customsDuty),
        shippingCost: Number(data.shippingCost),
        lines: data.lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          unitCost: Number(line.unitCost),
        })),
      }),
    });

    if (res.ok) {
      closeModal();
      router.refresh();
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus size={16} />
        New Purchase Order
      </Button>

      <Modal open={open} onClose={closeModal} title="" className="max-w-4xl">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Create Purchase Order
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add supplier details, procurement charges, and inventory line items.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Supplier details
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label="Supplier *"
                    options={[
                      { value: "", label: "Select supplier..." },
                      ...suppliers.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.vendorType})`,
                      })),
                    ]}
                    {...register("supplierId", { required: true })}
                  />

                  <Select
                    label="Currency"
                    options={["AED", "USD", "EUR", "GBP", "SAR"].map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    {...register("currency")}
                  />
                </div>

                {isRcm && selectedSupplier && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-amber-700">
                        <ShieldAlert size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          Reverse Charge Mechanism applies
                        </p>
                        <p className="mt-1 text-sm text-amber-700">
                          This supplier is treated as non-mainland, so VAT is self-assessed instead of posted as standard input VAT.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Purchase settings
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="Exchange Rate"
                    type="text"
                    inputMode="decimal"
                    placeholder="1"
                    {...register("exchangeRate")}
                  />
                  <Input
                    label="Customs Duty (AED)"
                    type="text"
                    inputMode="decimal"
                    {...register("customsDuty")}
                  />
                  <Input
                    label="Shipping Cost (AED)"
                    type="text"
                    inputMode="decimal"
                    {...register("shippingCost")}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Line items
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add stock items, quantity, and landed unit cost.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { append({ itemId: "", qty: "1", unitCost: "" }); setLineUoms((p) => [...p, ""]); }}
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
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_0.7fr_0.9fr_auto] md:items-end">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Item
                          </label>
                          <select
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.itemId`)}
                            onChange={(e) => {
                              register(`lines.${i}.itemId`).onChange(e);
                              const item = items.find((it) => it.id === e.target.value);
                              setLineUoms((prev) => { const next = [...prev]; next[i] = item?.uom ?? ""; return next; });
                            }}
                          >
                            <option value="">Select item...</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} — {item.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Qty
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                              {...register(`lines.${i}.qty`)}
                            />
                            {lineUoms[i] && (
                              <span className="shrink-0 rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                                {lineUoms[i]}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Unit Cost
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.unitCost`)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove purchase line item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">
                      Input VAT {isRcm ? "(RCM - self assessed)" : `(${(vatRate * 100).toFixed(0)}%)`}
                    </span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(inputVat)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Customs Duty</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(customsDuty)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Shipping Cost</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatAED(shippingCost)}
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
                {isSubmitting ? "Posting..." : "Receive Purchase"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

// ── Purchase Order status change button ──────────────────────────────────────
const PO_NEXT_STATUSES: Record<string, { value: string; label: string; className: string }[]> = {
  DRAFT: [
    { value: "RECEIVED", label: "Mark Received", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
    { value: "CANCELLED", label: "Cancel", className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
  ],
};

export function PurchaseStatusButton({ purchaseId, currentStatus }: { purchaseId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const actions = PO_NEXT_STATUSES[currentStatus];
  if (!actions || actions.length === 0) return null;

  const changeStatus = async (status: string) => {
    setLoading(true);
    setOpen(false);
    await fetch(`/api/purchases/${purchaseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        aria-label="Change purchase order status"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
        Status
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {actions.map((action) => (
              <button
                key={action.value}
                onClick={() => changeStatus(action.value)}
                className={`block w-full px-4 py-2.5 text-left text-sm font-medium transition ${action.className}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
