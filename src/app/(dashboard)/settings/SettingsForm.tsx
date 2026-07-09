"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Loader2,
  CheckCircle2,
  Building2,
  Receipt,
  CreditCard,
  Info,
} from "lucide-react";
import type { CompanySettings } from "@/lib/settings";

function Section({
  title,
  description,
  icon,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}
    >
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-slate-500">{icon}</span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR"];

export function SettingsForm({ settings }: { settings: CompanySettings }) {
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanySettings>({
    defaultValues: settings,
  });

  const onSubmit = async (data: CompanySettings) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <div className="space-y-6 2xl:col-span-7">
          <Section
            title="Business Profile"
            description="Company identity shown on invoices, reports, and official documents."
            icon={<Building2 size={18} />}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <Input
                  label="Company Name *"
                  placeholder="Unix Solutions LLC"
                  {...register("companyName", { required: "Required" })}
                  error={errors.companyName?.message}
                />
              </div>

              <Input
                label="Tax Registration Number (TRN)"
                placeholder="15-digit TRN e.g. 100123456789003"
                {...register("trn")}
              />

              <Input
                label="Phone"
                placeholder="+971 4 000 0000"
                {...register("phone")}
              />

              <div className="lg:col-span-2">
                <Input
                  label="Address"
                  placeholder="Office 101, Business Bay"
                  {...register("address")}
                />
              </div>

              <Field label="Emirate">
                <select
                  {...register("emirate")}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                >
                  {UAE_EMIRATES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </Field>

              <Input
                label="Email"
                type="email"
                placeholder="info@company.ae"
                {...register("email")}
              />

              <div className="lg:col-span-2">
                <Input
                  label="Logo URL"
                  placeholder="https://your-cdn.com/logo.png"
                  {...register("logoUrl")}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Invoice & Document Settings"
            description="Controls numbering and default billing document behavior."
            icon={<Receipt size={18} />}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Input
                label="Invoice Number Prefix"
                placeholder="INV"
                {...register("invoicePrefix")}
              />

              <Input
                label="Purchase Order Prefix"
                placeholder="PO"
                {...register("poPrefix")}
              />

              <Field label="Payment Terms (days)">
                <input
                  type="number"
                  min={0}
                  {...register("paymentTermsDays")}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                />
              </Field>

              <Field label="VAT Rate (%)">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("vatRate")}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                />
              </Field>
            </div>
          </Section>
        </div>

        <div className="space-y-6 2xl:col-span-5">
          <Section
            title="Financial Defaults"
            description="Baseline values used in ERP transaction flows."
            icon={<CreditCard size={18} />}
          >
            <div className="grid grid-cols-1 gap-4">
              <Field
                label="Default Currency"
                hint="This currency is used as the default selection for new records."
              >
                <select
                  {...register("defaultCurrency")}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section
            title="Guidance"
            description="Helpful notes to keep settings reliable across finance and documents."
            icon={<Info size={18} />}
          >
            <div className="space-y-3 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                Company name and TRN should exactly match official tax registration records.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                Prefixes should stay stable once documents are live to avoid numbering confusion.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                VAT rate changes affect invoices, purchase entries, and reporting consistency.
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Save configuration</p>
            <p className="text-sm text-slate-500">
              Changes update invoice, reporting, and company output defaults.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={16} />
                Settings saved
              </span>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}