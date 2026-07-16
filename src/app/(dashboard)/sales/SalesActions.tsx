"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { UAE_EMIRATES, formatAED } from "@/lib/utils";
import { Plus, Trash2, ReceiptText, Loader2, ChevronDown, User, Phone, Mail, MapPin, Hash, Pencil } from "lucide-react";

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
  invoiceDate: string;
  dueDate: string;
  lines: LineItem[];
};

export function SalesActions() {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [vatRate, setVatRate] = useState(0.05);
  const [error, setError] = useState("");
  const [lineUoms, setLineUoms] = useState<string[]>([""]);
  const [lineStocks, setLineStocks] = useState<(number | null)[]>([null]);
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
      invoiceDate: new Date().toISOString().slice(0, 10),
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

  const handleCustomerChange = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    if (c?.emirate) setValue("emirate", c.emirate);
  };

  const handleItemChange = (i: number, itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (item) {
      setValue(`lines.${i}.unitPrice`, Number(item.retailPrice).toFixed(2));
      setLineUoms((prev) => { const next = [...prev]; next[i] = item.uom ?? "PCS"; return next; });
      setLineStocks((prev) => { const next = [...prev]; next[i] = Number(item.stockQty); return next; });
    } else {
      setLineStocks((prev) => { const next = [...prev]; next[i] = null; return next; });
    }
  };

  useEffect(() => {
    if (open) {
      fetch("/api/customers").then((r) => r.json()).then((data) => setCustomers([...data].sort((a, b) => a.name.localeCompare(b.name))));
      fetch("/api/inventory").then((r) => r.json()).then(setItems);
      fetch("/api/users").then((r) => r.json()).then(setUsers);
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
      if (item?.taxType === "STANDARD") vat += net * vatRate;
    });

    return { subtotal, totalDiscount, vat, total: subtotal + vat };
  };

  const { subtotal, totalDiscount, vat, total } = calcTotals();

  const closeModal = () => {
    setError("");
    setLineUoms([""]);
    setLineStocks([null]);
    reset({
      customerId: "",
      currency: "AED",
      exchangeRate: "1",
      emirate: "",
      isSimplified: "false",
      invoiceDate: new Date().toISOString().slice(0, 10),
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
        invoiceDate: data.invoiceDate,
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

      <Modal open={open} onClose={closeModal} title="" className="max-w-5xl">
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
                    onChange={(e) => {
                      register("customerId").onChange(e);
                      handleCustomerChange(e.target.value);
                    }}
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

                {/* Customer info panel */}
                {(() => {
                  const cid = watch("customerId");
                  const c = customers.find((x) => x.id === cid);
                  if (!c) return null;
                  const assignedUser = c.assignedUserId ? users.find((u: any) => u.id === c.assignedUserId) : null;
                  return (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        {c.phone && <span className="flex items-center gap-1.5 text-slate-600"><Phone size={13} className="text-slate-400" />{c.phone}</span>}
                        {c.email && <span className="flex items-center gap-1.5 text-slate-600"><Mail size={13} className="text-slate-400" />{c.email}</span>}
                        {c.emirate && <span className="flex items-center gap-1.5 text-slate-600"><MapPin size={13} className="text-slate-400" />{c.emirate}</span>}
                        {c.trn && <span className="flex items-center gap-1.5 text-slate-600"><Hash size={13} className="text-slate-400" />TRN: {c.trn}</span>}
                        {c.address && <span className="flex items-center gap-1.5 text-slate-600"><MapPin size={13} className="text-slate-400" />{c.address}</span>}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${c.isB2B ? "bg-sky-50 text-sky-700 ring-sky-100" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                          {c.isB2B ? "B2B" : "B2C"}
                        </span>
                        {assignedUser && (
                          <span className="flex items-center gap-1.5">
                            <User size={13} className="text-violet-400" />
                            <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                              Assigned: {assignedUser.name}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
                    type="text"
                    inputMode="decimal"
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

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Input label="Invoice Date *" type="date" {...register("invoiceDate", { required: true })} />
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
                    onClick={() => { append({ itemId: "", qty: "1", unitPrice: "", discountPct: "0" }); setLineUoms((p) => [...p, ""]); setLineStocks((p) => [...p, null]); }}
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
                                {item.sku} — {item.name}
                              </option>
                            ))}
                          </select>
                          {lineStocks[i] !== null && (
                            <p className={`mt-1.5 text-xs font-medium ${
                              lineStocks[i]! <= 0 ? "text-rose-600" : lineStocks[i]! <= 5 ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              Stock: {lineStocks[i]} {lineUoms[i] || ""}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Qty</label>
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
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Unit Price</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.unitPrice`)}
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Disc %</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.discountPct`)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => { remove(i); setLineUoms((p) => p.filter((_, idx) => idx !== i)); setLineStocks((p) => p.filter((_, idx) => idx !== i)); }}
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
                    <span className="text-slate-500">VAT {(vatRate * 100).toFixed(0)}%</span>
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

// ── Edit Invoice Button ───────────────────────────────────────────────────────
export function EditInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [vatRate, setVatRate] = useState(0.05);
  const [error, setError] = useState("");
  const [lineUoms, setLineUoms] = useState<string[]>([]);
  const [lineStocks, setLineStocks] = useState<(number | null)[]>([]);
  const router = useRouter();

  const { register, handleSubmit, control, watch, reset, setValue, formState: { isSubmitting } } =
    useForm<FormData>({
      defaultValues: {
        customerId: "", currency: "AED", exchangeRate: "1",
        emirate: "", isSimplified: "false",
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        lines: [{ itemId: "", qty: "1", unitPrice: "", discountPct: "0" }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = watch("lines");
  const watchedCurrency = watch("currency");

  const handleCustomerChange = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    if (c?.emirate) setValue("emirate", c.emirate);
  };

  const handleItemChange = (i: number, itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (item) {
      setValue(`lines.${i}.unitPrice`, Number(item.retailPrice).toFixed(2));
      setLineUoms((prev) => { const next = [...prev]; next[i] = item.uom ?? "PCS"; return next; });
      setLineStocks((prev) => { const next = [...prev]; next[i] = Number(item.stockQty); return next; });
    } else {
      setLineStocks((prev) => { const next = [...prev]; next[i] = null; return next; });
    }
  };

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch(`/api/sales/${invoiceId}`).then((r) => r.json()),
    ]).then(([custs, invItems, settings, inv]) => {
      setCustomers([...custs].sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setItems(invItems);
      if (settings?.vatRate != null) setVatRate(Number(settings.vatRate) / 100);

      const uoms = inv.lines.map((l: any) => l.item?.uom ?? "PCS");
      const stocks = inv.lines.map((l: any) => {
        const it = invItems.find((i: any) => i.id === l.itemId);
        return it ? Number(it.stockQty) + Number(l.qty) : null; // add back sold qty for display
      });
      setLineUoms(uoms);
      setLineStocks(stocks);

      reset({
        customerId: inv.customerId,
        currency: inv.currency,
        exchangeRate: String(inv.exchangeRate),
        emirate: inv.emirate ?? "",
        isSimplified: String(inv.isSimplified),
        invoiceDate: inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "",
        lines: inv.lines.map((l: any) => ({
          itemId: l.itemId,
          qty: String(l.qty),
          unitPrice: String(l.unitPrice),
          discountPct: String(l.discountPct ?? 0),
        })),
      });
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (watchedCurrency === "AED") { setValue("exchangeRate", "1"); return; }
    fetch(`/api/exchange-rates?currency=${watchedCurrency}`)
      .then((r) => r.json())
      .then((data) => { if (data.rate) setValue("exchangeRate", Number(data.rate).toFixed(2)); })
      .catch(() => {});
  }, [watchedCurrency, open]);

  const calcTotals = () => {
    let subtotal = 0, totalDiscount = 0, vat = 0;
    watchedLines.forEach((line) => {
      const item = items.find((i) => i.id === line.itemId);
      const gross = Number(line.qty || 0) * Number(line.unitPrice || 0);
      const disc = gross * (Number(line.discountPct || 0) / 100);
      const net = gross - disc;
      subtotal += net;
      totalDiscount += disc;
      if (item?.taxType === "STANDARD") vat += net * vatRate;
    });
    return { subtotal, totalDiscount, vat, total: subtotal + vat };
  };

  const { subtotal, totalDiscount, vat, total } = calcTotals();

  const onSubmit = async (data: FormData) => {
    setError("");
    const res = await fetch(`/api/sales/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        edit: true,
        ...data,
        isSimplified: data.isSimplified === "true",
        exchangeRate: Number(data.exchangeRate),
        invoiceDate: data.invoiceDate,
        lines: data.lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          discountPct: Number(line.discountPct || 0),
        })),
      }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to update invoice.");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
        aria-label="Edit invoice"
      >
        <Pencil size={14} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="" className="max-w-5xl">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Pencil size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Edit Invoice</h2>
                <p className="mt-1 text-sm text-slate-500">Changes will reverse the original journal and repost with updated figures.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Customer details</p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label="Customer *"
                    options={[{ value: "", label: "Select customer…" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
                    {...register("customerId", { required: true })}
                    onChange={(e) => { register("customerId").onChange(e); handleCustomerChange(e.target.value); }}
                  />
                  <Select
                    label="Emirate"
                    options={[{ value: "", label: "Select emirate…" }, ...UAE_EMIRATES.map((e) => ({ value: e, label: e }))]}
                    {...register("emirate")}
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Invoice settings</p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Select
                    label="Currency"
                    options={["AED","USD","EUR","GBP","SAR"].map((c) => ({ value: c, label: c }))}
                    {...register("currency")}
                  />
                  <Input label="Exchange Rate" type="text" inputMode="decimal" {...register("exchangeRate")} />
                  <Select
                    label="Invoice Type"
                    options={[{ value: "false", label: "Tax Invoice" }, { value: "true", label: "Simplified Tax Invoice" }]}
                    {...register("isSimplified")}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Input label="Invoice Date *" type="date" {...register("invoiceDate", { required: true })} />
                  <Input label="Due Date" type="date" {...register("dueDate")} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Line items</p>
                  <button
                    type="button"
                    onClick={() => { append({ itemId: "", qty: "1", unitPrice: "", discountPct: "0" }); setLineUoms((p) => [...p, ""]); setLineStocks((p) => [...p, null]); }}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus size={14} /> Add Line
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {fields.map((field, i) => (
                    <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_0.6fr_0.8fr_0.6fr_auto] md:items-end">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Item</label>
                          <select
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.itemId`)}
                            onChange={(e) => { register(`lines.${i}.itemId`).onChange(e); handleItemChange(i, e.target.value); }}
                          >
                            <option value="">Select item…</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>
                            ))}
                          </select>
                          {lineStocks[i] !== null && (
                            <p className={`mt-1.5 text-xs font-medium ${
                              lineStocks[i]! <= 0 ? "text-rose-600" : lineStocks[i]! <= 5 ? "text-amber-600" : "text-emerald-600"
                            }`}>Stock: {lineStocks[i]} {lineUoms[i] || ""}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Qty</label>
                          <div className="flex items-center gap-1.5">
                            <input type="text" inputMode="decimal"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                              {...register(`lines.${i}.qty`)} />
                            {lineUoms[i] && <span className="shrink-0 rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">{lineUoms[i]}</span>}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Unit Price</label>
                          <input type="text" inputMode="decimal"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.unitPrice`)} />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Disc %</label>
                          <input type="text" inputMode="decimal"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            {...register(`lines.${i}.discountPct`)} />
                        </div>
                        <button type="button" onClick={() => { remove(i); setLineUoms((p) => p.filter((_, idx) => idx !== i)); setLineStocks((p) => p.filter((_, idx) => idx !== i)); }}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:bg-red-50"
                          aria-label="Remove line">
                          <Trash2 size={16} />
                        </button>
                      </div>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Totals</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Subtotal (excl. VAT)</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(subtotal + totalDiscount)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Discount</span>
                      <span className="font-medium text-red-500 [font-variant-numeric:tabular-nums]">− {formatAED(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Net (excl. VAT)</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">VAT {(vatRate * 100).toFixed(0)}%</span>
                    <span className="font-medium text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(vat)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span className="text-base font-semibold text-slate-900">Total AED</span>
                    <span className="text-base font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
              {error && <p className="flex-1 text-sm font-medium text-red-600">{error}</p>}
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="min-h-[44px] rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

// ── Invoice status change button ──────────────────────────────────────────────
type PaymentForm = {
  status: string;
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

export function SalesStatusButton({
  invoiceId,
  currentStatus,
  invoiceTotal,
}: {
  invoiceId: string;
  currentStatus: string;
  invoiceTotal?: number;
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [balanceDue, setBalanceDue] = useState<number | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const router = useRouter();

  const { register, handleSubmit, watch, reset, setValue, formState: { isSubmitting } } = useForm<PaymentForm>({
    defaultValues: {
      status: "PAID", method: "CASH",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      bankName: "", transactionId: "", chequeNumber: "",
      chequeDate: "", chequeBank: "", notes: "",
    },
  });

  useEffect(() => {
    if (!payOpen) return;
    Promise.all([
      fetch(`/api/sales/${invoiceId}`).then((r) => r.json()),
      fetch("/api/finance/bank-accounts").then((r) => r.json()),
    ]).then(([inv, banks]) => {
      const paid = (inv.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const due  = Math.max(0, Number(inv.totalAed) - paid);
      setBalanceDue(due);
      setValue("amount", due.toFixed(2));
      setBankAccounts(banks ?? []);
    });
  }, [payOpen]);

  const method   = watch("method");
  const statusVal = watch("status");

  const canPay = currentStatus === "ISSUED" || currentStatus === "PARTIALLY_PAID";

  const otherActions: { value: string; label: string; cls: string }[] = [];
  if (currentStatus === "DRAFT") {
    otherActions.push({ value: "ISSUED",    label: "Mark Issued",   cls: "bg-sky-50 text-sky-700 hover:bg-sky-100" });
    otherActions.push({ value: "CANCELLED", label: "Cancel Invoice", cls: "bg-rose-50 text-rose-700 hover:bg-rose-100" });
  }
  if (currentStatus === "ISSUED" || currentStatus === "PARTIALLY_PAID") {
    otherActions.push({ value: "CANCELLED", label: "Cancel Invoice", cls: "bg-rose-50 text-rose-700 hover:bg-rose-100" });
  }

  if (!canPay && otherActions.length === 0) return null;

  const changeStatus = async (status: string) => {
    setLoading(true); setDropOpen(false);
    await fetch(`/api/sales/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  };

  const onPaySubmit = async (data: PaymentForm) => {
    await fetch(`/api/sales/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: data.status,
        payment: {
          method:        data.method,
          amount:        Number(data.amount),
          date:          data.date,
          bankName:      data.bankName      || null,
          transactionId: data.transactionId || null,
          chequeNumber:  data.chequeNumber  || null,
          chequeDate:    data.chequeDate    || null,
          chequeBank:    data.chequeBank    || null,
          notes:         data.notes         || null,
        },
      }),
    });
    reset();
    setBalanceDue(null);
    setPayOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {canPay && (
          <button
            onClick={() => setPayOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Record Payment
          </button>
        )}
        {otherActions.length > 0 && (
          <div className="relative inline-block">
            <button
              onClick={() => setDropOpen((v) => !v)}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
            </button>
            {dropOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  {otherActions.map((a) => (
                    <button key={a.value} onClick={() => changeStatus(a.value)}
                      className={`block w-full px-4 py-2.5 text-left text-sm font-medium transition ${a.cls}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="" className="max-w-lg">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Record Payment</h2>
            <p className="mt-1 text-sm text-slate-500">Enter payment details — saved to ledger and payment history.</p>
            {balanceDue !== null && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                Balance Due: {formatAED(balanceDue)}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onPaySubmit)} className="space-y-4 px-5 py-5 sm:px-6">

            {/* Fully / Partially paid toggle */}
            <div className="grid grid-cols-2 gap-3">
              {([{ v: "PAID", label: "Fully Paid" }, { v: "PARTIALLY_PAID", label: "Partially Paid" }] as const).map((opt) => (
                <label key={opt.v}
                  className={`flex cursor-pointer items-center justify-center rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                    statusVal === opt.v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}>
                  <input type="radio" className="sr-only" value={opt.v} {...register("status")} />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Payment method pills */}
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
              <Input label="Amount (AED) *" type="text" inputMode="decimal" {...register("amount", { required: true })} />
              <Input label="Payment Date *" type="date" {...register("date", { required: true })} />
            </div>

            {/* BANK TRANSFER */}
            {method === "BANK_TRANSFER" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Bank Transfer Details</p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Bank Account *</label>
                  <select {...register("bankName")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20">
                    <option value="">Select bank account…</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.name}>{b.name} — {b.bankName}</option>
                    ))}
                  </select>
                </div>
                <Input label="Transaction / Reference ID" placeholder="TXN123456" {...register("transactionId")} />
              </div>
            )}

            {/* ONLINE */}
            {method === "ONLINE" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Online Payment Details</p>
                <Input label="Transaction ID *" placeholder="e.g. PAY-ABC123" {...register("transactionId")} />
                <Input label="Platform / Gateway" placeholder="e.g. Stripe, PayTabs, Network" {...register("bankName")} />
              </div>
            )}

            {/* CARD */}
            {method === "CARD" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Card Payment Details</p>
                <Input label="Approval / Transaction Code" placeholder="e.g. 123456" {...register("transactionId")} />
                <Input label="Bank / Terminal" placeholder="e.g. FAB POS Terminal" {...register("bankName")} />
              </div>
            )}

            {/* CHEQUE */}
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

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes <span className="text-slate-400">(optional)</span></label>
              <textarea rows={2} placeholder="Any additional payment notes..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                {...register("notes")} />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setPayOpen(false)} className="min-h-[44px] rounded-2xl">Cancel</Button>
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
