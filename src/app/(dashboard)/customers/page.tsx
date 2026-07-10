import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { CustomerActions, CustomerEditButton } from "./CustomerActions";
import Link from "next/link";
import {
  Users,
  Building2,
  Wallet,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

function SurfaceCard({
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

function StatCard({
  title,
  value,
  sub,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "default" | "blue" | "emerald" | "amber";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    blue: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">
            {value}
          </p>
          {sub ? <p className="mt-1 text-sm text-slate-500">{sub}</p> : null}
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </SurfaceCard>
  );
}

function CustomerTypeBadge({ isB2B }: { isB2B: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        isB2B
          ? "bg-sky-50 text-sky-700 ring-sky-100"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {isB2B ? "B2B" : "B2C"}
    </span>
  );
}

function OutstandingBadge({ amount }: { amount: number }) {
  if (amount > 0) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
        {formatAED(amount)}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
      Cleared
    </span>
  );
}

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: { invoices: { select: { totalAed: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  // fetch all users for name lookup
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const mappedCustomers = customers.map((c) => {
    const totalRevenue = c.invoices.reduce((sum, i) => sum + Number(i.totalAed), 0);
    const outstanding = c.invoices
      .filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID")
      .reduce((sum, i) => sum + Number(i.totalAed), 0);

    return {
      ...c,
      totalRevenue,
      outstanding,
    };
  });

  const totalCustomers = mappedCustomers.length;
  const b2bCount = mappedCustomers.filter((c) => c.isB2B).length;
  const totalRevenueAll = mappedCustomers.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalOutstanding = mappedCustomers.reduce((sum, c) => sum + c.outstanding, 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">
        {/* Header */}
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Customer management
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Customers
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage clients, monitor revenue, and review outstanding balances.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <CustomerActions />
            </div>
          </div>
        </SurfaceCard>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total customers"
            value={String(totalCustomers)}
            sub="Registered accounts"
            icon={<Users size={20} />}
            tone="blue"
          />
          <StatCard
            title="Business customers"
            value={String(b2bCount)}
            sub={`${totalCustomers - b2bCount} retail customers`}
            icon={<Building2 size={20} />}
            tone="default"
          />
          <StatCard
            title="Total revenue"
            value={formatAED(totalRevenueAll)}
            sub="Across all invoices"
            icon={<Wallet size={20} />}
            tone="emerald"
          />
          <StatCard
            title="Outstanding"
            value={formatAED(totalOutstanding)}
            sub="Pending collections"
            icon={<AlertCircle size={20} />}
            tone="amber"
          />
        </section>

        {/* Desktop table */}
        <SurfaceCard className="hidden overflow-hidden lg:block">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Customer directory
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {totalCustomers} registered customers
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    TRN
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Emirate
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Assigned
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Total revenue
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Outstanding
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {mappedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {customer.invoices.length} invoices
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.trn ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.emirate ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.assignedUserId ? (
                        <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                          {userMap[customer.assignedUserId] ?? "—"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <CustomerTypeBadge isB2B={customer.isB2B} />
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                      {formatAED(customer.totalRevenue)}
                    </td>

                    <td className="px-6 py-4">
                      <OutstandingBadge amount={customer.outstanding} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/customers/${customer.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                          <ExternalLink size={12} /> View
                        </Link>
                        <CustomerEditButton
                          customerId={customer.id}
                          name={customer.name}
                          email={customer.email}
                          phone={customer.phone}
                          trn={customer.trn}
                          emirate={customer.emirate}
                          address={customer.address}
                          isB2B={customer.isB2B}
                          assignedUserId={customer.assignedUserId}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        {/* Mobile + tablet cards */}
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          <div className="px-1">
            <h2 className="text-base font-semibold text-slate-900">
              Customer directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {totalCustomers} registered customers
            </p>
          </div>

          {mappedCustomers.map((customer) => (
            <SurfaceCard key={customer.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">
                    {customer.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {customer.invoices.length} invoices
                  </p>
                </div>

                <CustomerTypeBadge isB2B={customer.isB2B} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    TRN
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 break-words">
                    {customer.trn ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Emirate
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {customer.emirate ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Revenue
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                    {formatAED(customer.totalRevenue)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Outstanding
                  </p>
                  <div className="mt-1">
                    <OutstandingBadge amount={customer.outstanding} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-400">Customer summary</p>
                <CustomerEditButton
                  customerId={customer.id}
                  name={customer.name}
                  email={customer.email}
                  phone={customer.phone}
                  trn={customer.trn}
                  emirate={customer.emirate}
                  address={customer.address}
                  isB2B={customer.isB2B}
                  assignedUserId={customer.assignedUserId}
                />
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </main>
  );
}