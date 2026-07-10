"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, Receipt, Loader2, Pencil } from "lucide-react";

type FormData = {
  description: string; category: string;
  amount: string; date: string; reference: string;
};

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SALARIES", label: "Salaries" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "BANK_CHARGES", label: "Bank Charges" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

// ── Shared form body ──────────────────────────────────────────────────────────
function ExpenseFormFields({
  register,
  errors,
  isSubmitting,
  onCancel,
  submitLabel,
}: {
  register: ReturnType<typeof useForm<FormData>>["register"];
  errors: ReturnType<typeof useForm<FormData>>["formState"]["errors"];
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <Input label="Description *" placeholder="e.g. Office rent for July"
        {...register("description", { required: "Required" })}
        error={errors.description?.message} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Category" options={CATEGORIES} {...register("category")} />
        <Input label="Amount (AED) *" type="number" step="0.01" placeholder="0.00"
          {...register("amount", { required: "Required" })}
          error={errors.amount?.message} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date" type="date" {...register("date")} />
        <Input label="Reference" placeholder="Optional" {...register("reference")} />
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px] rounded-2xl">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Edit button (row action) ───────────────────────────────────────────────────
export function ExpenseEditButton(props: {
  expenseId: string;
  description: string;
  category: string;
  amount: number;
  date: Date;
  reference?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      description: props.description,
      category: props.category,
      amount: String(props.amount),
      date: new Date(props.date).toISOString().slice(0, 10),
      reference: props.reference ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        description: props.description,
        category: props.category,
        amount: String(props.amount),
        date: new Date(props.date).toISOString().slice(0, 10),
        reference: props.reference ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/expenses/${props.expenseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, amount: Number(data.amount) }),
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
        aria-label={`Edit expense: ${props.description}`}
      >
        <Pencil size={14} />
      </button>

      <Modal open={open} onClose={() => { reset(); setOpen(false); }} title="">
        <div className="w-full max-w-lg">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Pencil size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit Expense</h2>
                <p className="text-sm text-slate-500">Update this expense record.</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
            <ExpenseFormFields
              register={register} errors={errors}
              isSubmitting={isSubmitting} onCancel={() => setOpen(false)}
              submitLabel="Save Changes" />
          </form>
        </div>
      </Modal>
    </>
  );
}

// ── New Expense button (toolbar) ──────────────────────────────────────────────
export function ExpenseActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { category: "OTHER", date: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (data: FormData) => {
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, amount: Number(data.amount) }),
    });
    reset({ category: "OTHER", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">
        <Plus size={16} /> Add Expense
      </Button>

      <Modal open={open} onClose={() => { reset(); setOpen(false); }} title="">
        <div className="w-full max-w-lg">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Receipt size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Record Expense</h2>
                <p className="text-sm text-slate-500">Posts a DR Expense / CR Cash journal entry</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
            <ExpenseFormFields
              register={register} errors={errors}
              isSubmitting={isSubmitting} onCancel={() => { reset(); setOpen(false); }}
              submitLabel="Save Expense" />
          </form>
        </div>
      </Modal>
    </>
  );
}

type FormData = {
  description: string; category: string;
  amount: string; date: string; reference: string;
};

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SALARIES", label: "Salaries" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "BANK_CHARGES", label: "Bank Charges" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

export function ExpenseActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { category: "OTHER", date: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (data: FormData) => {
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, amount: Number(data.amount) }),
    });
    reset({ category: "OTHER", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">
        <Plus size={16} /> Add Expense
      </Button>

      <Modal open={open} onClose={() => { reset(); setOpen(false); }} title="">
        <div className="w-full max-w-lg">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Receipt size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Record Expense</h2>
                <p className="text-sm text-slate-500">Posts a DR Expense / CR Cash journal entry</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
            <Input label="Description *" placeholder="e.g. Office rent for July"
              {...register("description", { required: "Required" })}
              error={errors.description?.message} />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Category" options={CATEGORIES} {...register("category")} />
              <Input label="Amount (AED) *" type="number" step="0.01" placeholder="0.00"
                {...register("amount", { required: "Required" })}
                error={errors.amount?.message} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" type="date" {...register("date")} />
              <Input label="Reference" placeholder="Optional" {...register("reference")} />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" onClick={() => { reset(); setOpen(false); }}
                className="min-h-[44px] rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                {isSubmitting ? "Saving…" : "Save Expense"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
