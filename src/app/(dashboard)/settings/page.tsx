import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./SettingsForm";
import { UomManager } from "./UomManager";
import {
  Settings,
  Building2,
  Receipt,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function InfoTile({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-200">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{desc}</p>
    </div>
  );
}

export default async function SettingsPage() {
  const [settings, uoms] = await Promise.all([
    getSettings(),
    prisma.uomSetting.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <Settings size={22} />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Configuration
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Business Settings
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Control company details, invoice defaults, and financial preferences used across the ERP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Profile
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">Company data</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Documents
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">Invoice rules</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Finance
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">VAT and currency</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Status
                </p>
                <p className="mt-1 text-sm font-medium text-emerald-600">Ready</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <UomManager initial={uoms} />
            <SettingsForm settings={settings} />
          </div>

          <aside className="space-y-6">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-slate-900">What this controls</h2>
              <p className="mt-1 text-sm text-slate-500">
                These settings are used across operational documents and core ERP flows.
              </p>

              <div className="mt-4 space-y-3">
                <InfoTile
                  title="Business profile"
                  desc="Used on invoices, reports, quotations, and official company outputs."
                  icon={<Building2 size={18} />}
                />
                <InfoTile
                  title="Document prefixes"
                  desc="Controls invoice and purchase numbering references across transactions."
                  icon={<Receipt size={18} />}
                />
                <InfoTile
                  title="Financial defaults"
                  desc="Defines the default currency and baseline VAT behavior for transactions."
                  icon={<CreditCard size={18} />}
                />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Best practice</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Keep company name, TRN, prefixes, and VAT rate accurate because these values directly affect invoice output and accounting consistency.
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}