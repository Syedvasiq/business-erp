"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Plus, Truck, Globe2, Loader2 } from "lucide-react";

type FormData = {
  name: string;
  email: string;
  phone: string;
  trn: string;
  vendorType: string;
  currency: string;
};

export function SupplierActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      trn: "",
      vendorType: "MAINLAND",
      currency: "AED",
    },
  });

  const closeModal = () => {
    reset();
    setOpen(false);
  };

  const onSubmit = async (data: FormData) => {
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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
        New Supplier
      </Button>

      <Modal open={open} onClose={closeModal} title="">
        <div className="w-full max-w-lg sm:max-w-xl">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Truck size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Add Supplier
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a new supplier for purchases and tax handling.
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
                <div className="mt-3 space-y-4">
                  <Input
                    label="Supplier Name *"
                    placeholder="Enter supplier name"
                    {...register("name", { required: "Supplier name is required" })}
                    error={errors.name?.message}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Email"
                      type="email"
                      placeholder="supplier@example.com"
                      {...register("email")}
                    />
                    <Input
                      label="Phone"
                      placeholder="+971 50 123 4567"
                      {...register("phone")}
                    />
                  </div>

                  <Input
                    label="TRN"
                    placeholder="Optional tax registration number"
                    {...register("trn")}
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Tax and payment setup
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    label="Vendor Type"
                    options={[
                      { value: "MAINLAND", label: "UAE Mainland" },
                      { value: "FREE_ZONE", label: "Free Zone" },
                      { value: "INTERNATIONAL", label: "International" },
                    ]}
                    {...register("vendorType")}
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
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Globe2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Tax handling note
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Free Zone and International suppliers usually fall under reverse charge handling.
                    </p>
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
                {isSubmitting ? "Saving Supplier..." : "Save Supplier"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}