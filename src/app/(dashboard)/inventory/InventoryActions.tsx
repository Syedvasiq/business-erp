"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Plus, Package, Receipt, Loader2, Pencil } from "lucide-react";

type FormData = {
  name: string;
  sku: string;
  barcode: string;
  uom: string;
  unitCost: string;
  retailPrice: string;
  taxType: string;
  stockQty: string;
  supplierId: string;
};

type Supplier = { id: string; name: string };

// ── Shared form body ──────────────────────────────────────────────────────────
function ItemFormFields({
  register,
  errors,
  suppliers,
  isSubmitting,
  onCancel,
  submitLabel,
  skuReadOnly = false,
  uoms,
}: {
  register: ReturnType<typeof useForm<FormData>>["register"];
  errors: ReturnType<typeof useForm<FormData>>["formState"]["errors"];
  suppliers: Supplier[];
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
  skuReadOnly?: boolean;
  uoms?: { code: string; label: string }[];
}) {
  const UOM_OPTIONS = uoms && uoms.length > 0
    ? uoms.map((u) => ({ value: u.code, label: `${u.code} — ${u.label}` }))
    : ["PCS","KG","LTR","MTR","BOX","CTN","SET","PKT","TON","SQM"].map((u) => ({ value: u, label: u }));
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Item details</p>
        <div className="mt-3 space-y-4">
          <Input label="Item Name *" placeholder="Enter item name"
            {...register("name", { required: "Item name is required" })}
            error={errors.name?.message} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="SKU *" placeholder="SKU-1001"
              readOnly={skuReadOnly}
              className={skuReadOnly ? "bg-slate-50 cursor-not-allowed" : ""}
              {...register("sku", { required: "SKU is required" })}
              error={errors.sku?.message} />
            <Input label="Barcode" placeholder="Optional barcode" {...register("barcode")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Unit of Measurement"
              options={UOM_OPTIONS}
              {...register("uom")} />
            <Select label="Supplier"
              options={[{ value: "", label: "— None —" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
              {...register("supplierId")} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pricing & stock</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Unit Cost (AED) *" type="text" inputMode="decimal" placeholder="0.00"
            {...register("unitCost", { required: "Unit cost is required" })}
            error={errors.unitCost?.message} />
          <Input label="Retail Price (AED) *" type="text" inputMode="decimal" placeholder="0.00"
            {...register("retailPrice", { required: "Retail price is required" })}
            error={errors.retailPrice?.message} />
          {!skuReadOnly && (
            <Input label="Opening Stock Qty" type="text" inputMode="decimal" placeholder="0"
              {...register("stockQty")} />
          )}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tax classification</p>
        <div className="mt-3">
          <Select label="UAE Tax Classification"
            options={[
              { value: "STANDARD", label: "Standard Rate (5% VAT)" },
              { value: "ZERO_RATED", label: "Zero-Rated (0% - Exports)" },
              { value: "EXEMPT", label: "Exempt" },
            ]}
            {...register("taxType")} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
            <Receipt size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Inventory note</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Use the correct VAT type so sales, reporting, and stock value remain accurate.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px] rounded-2xl">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Edit button (row action) ───────────────────────────────────────────────────
export function InventoryEditButton(props: {
  itemId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  uom?: string;
  unitCost: number;
  retailPrice: number;
  taxType: string;
  supplierId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [uoms, setUoms] = useState<{ code: string; label: string }[]>([]);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      name: props.name,
      sku: props.sku,
      barcode: props.barcode ?? "",
      uom: (props as any).uom ?? "PCS",
      unitCost: String(props.unitCost),
      retailPrice: String(props.retailPrice),
      taxType: props.taxType,
      stockQty: "0",
      supplierId: props.supplierId ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      if (suppliers.length === 0) {
        fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
      }
      if (uoms.length === 0) {
        fetch("/api/uom").then((r) => r.json()).then(setUoms);
      }
      reset({
        name: props.name,
        sku: props.sku,
        barcode: props.barcode ?? "",
        uom: (props as any).uom ?? "PCS",
        unitCost: String(props.unitCost),
        retailPrice: String(props.retailPrice),
        taxType: props.taxType,
        stockQty: "0",
        supplierId: props.supplierId ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/inventory/${props.itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        barcode: data.barcode || undefined,
        uom: data.uom,
        unitCost: Number(data.unitCost),
        retailPrice: Number(data.retailPrice),
        taxType: data.taxType,
        supplierId: data.supplierId || undefined,
      }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
        aria-label={`Edit ${props.name}`}
      >
        <Pencil size={14} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="" className="max-w-lg sm:max-w-xl">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Pencil size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Edit Item</h2>
                <p className="mt-1 text-sm text-slate-500">Update pricing, tax, and supplier for {props.name}.</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <ItemFormFields
              register={register} errors={errors} suppliers={suppliers} uoms={uoms}
              isSubmitting={isSubmitting} onCancel={() => setOpen(false)}
              submitLabel="Save Changes" skuReadOnly />
          </form>
        </div>
      </Modal>
    </>
  );
}

// ── New Item button (toolbar) ─────────────────────────────────────────────────
export function InventoryActions() {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [uoms, setUoms] = useState<{ code: string; label: string }[]>([]);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { name: "", sku: "", barcode: "", uom: "PCS", unitCost: "", retailPrice: "", taxType: "STANDARD", stockQty: "0", supplierId: "" },
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
    fetch("/api/uom").then((r) => r.json()).then(setUoms);
  }, [open]);

  const closeModal = () => { reset(); setOpen(false); };

  const onSubmit = async (data: FormData) => {
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name, sku: data.sku,
        barcode: data.barcode || undefined,
        uom: data.uom,
        unitCost: Number(data.unitCost),
        retailPrice: Number(data.retailPrice),
        taxType: data.taxType,
        stockQty: Number(data.stockQty),
        supplierId: data.supplierId || undefined,
      }),
    });
    reset();
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus size={16} />
        New Item
      </Button>

      <Modal open={open} onClose={closeModal} title="" className="max-w-lg sm:max-w-xl">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <Package size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Add Inventory Item</h2>
                <p className="mt-1 text-sm text-slate-500">Create a new stock item with pricing and tax classification.</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <ItemFormFields
              register={register} errors={errors} suppliers={suppliers} uoms={uoms}
              isSubmitting={isSubmitting} onCancel={closeModal}
              submitLabel="Save Item" />
          </form>
        </div>
      </Modal>
    </>
  );
}