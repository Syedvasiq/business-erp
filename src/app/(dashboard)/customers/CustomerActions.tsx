"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { UAE_EMIRATES } from "@/lib/utils";
import { Plus, UserPlus, Building2, Loader2, Pencil } from "lucide-react";

type FormData = {
  name: string;
  email: string;
  phone: string;
  trn: string;
  emirate: string;
  address: string;
  isB2B: string;
};

// ── Shared form fields ────────────────────────────────────────────────────────
function CustomerForm({
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
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Basic details
        </p>
        <div className="mt-3 space-y-4">
          <Input
            label="Full Name *"
            placeholder="Enter customer full name"
            {...register("name", { required: "Full name is required" })}
            error={errors.name?.message}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" placeholder="name@example.com" {...register("email")} />
            <Input label="Phone" placeholder="+971 50 123 4567" {...register("phone")} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Tax and classification
        </p>
        <div className="mt-3 space-y-4">
          <Input
            label="TRN"
            placeholder="100123456700003"
            {...register("trn", {
              pattern: { value: /^\d{15}$/, message: "TRN must be exactly 15 digits" },
            })}
            error={errors.trn?.message}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Emirate"
              options={UAE_EMIRATES.map((e) => ({ value: e, label: e }))}
              {...register("emirate")}
            />
            <Select
              label="Customer Type"
              options={[
                { value: "false", label: "B2C" },
                { value: "true", label: "B2B" },
              ]}
              {...register("isB2B")}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Additional info
        </p>
        <div className="mt-3">
          <Input label="Address" placeholder="Street, area, city" {...register("address")} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
            <Building2 size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Customer profile note</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Add TRN for taxable business customers and use B2B for company accounts.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px] rounded-2xl">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Edit button (row action) ───────────────────────────────────────────────────
export function CustomerEditButton(props: {
  customerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  trn?: string | null;
  emirate?: string | null;
  address?: string | null;
  isB2B: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      name: props.name,
      email: props.email ?? "",
      phone: props.phone ?? "",
      trn: props.trn ?? "",
      emirate: props.emirate ?? "",
      address: props.address ?? "",
      isB2B: props.isB2B ? "true" : "false",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: props.name,
        email: props.email ?? "",
        phone: props.phone ?? "",
        trn: props.trn ?? "",
        emirate: props.emirate ?? "",
        address: props.address ?? "",
        isB2B: props.isB2B ? "true" : "false",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/customers/${props.customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, isB2B: data.isB2B === "true" }),
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

      <Modal open={open} onClose={() => setOpen(false)} title="" className="max-w-[552px]">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Pencil size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Edit Customer</h2>
                <p className="mt-1 text-sm text-slate-500">Update profile for {props.name}.</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <CustomerForm
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              onCancel={() => setOpen(false)}
              submitLabel="Save Changes"
            />
          </form>
        </div>
      </Modal>
    </>
  );
}

// ── New Customer button (toolbar) ─────────────────────────────────────────────
export function CustomerActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { name: "", email: "", phone: "", trn: "", emirate: "", address: "", isB2B: "false" },
  });

  const closeModal = () => { reset(); setOpen(false); };

  const onSubmit = async (data: FormData) => {
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, isB2B: data.isB2B === "true" }),
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
        New Customer
      </Button>

      <Modal open={open} onClose={closeModal} title="" className="max-w-[552px]">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <UserPlus size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Add Customer</h2>
                <p className="mt-1 text-sm text-slate-500">Create a new customer profile for sales and billing.</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <CustomerForm
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              onCancel={closeModal}
              submitLabel="Save Customer"
            />
          </form>
        </div>
      </Modal>
    </>
  );
}