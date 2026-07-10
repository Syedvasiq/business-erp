import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { getSession } from "@/lib/session";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  Package,
  FileText,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock3,
  ArrowRight,
  BarChart3,
  Activity,
} from "lucide-react";

// helpers
function pctChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function formatShortDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
  });
}

function getTrendTone(pct: number | null | undefined) {
  if (pct === null || pct === undefined) return "neutral";
  if (pct > 0) return "positive";
  if (pct < 0) return "negative";
  return "neutral";
}

// UI atoms
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

function SectionHeader({
  title,
  subtitle,
  href,
  icon,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          View all
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

function TrendBadge({
  pct,
  label,
}: {
  pct: number | null | undefined;
  label?: string;
}) {
  if (pct === null || pct === undefined) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        No history
      </span>
    );
  }

  const tone = getTrendTone(pct);

  const styles =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "negative"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles}`}>
      {tone === "positive" ? (
        <TrendingUp size={12} />
      ) : tone === "negative" ? (
        <TrendingDown size={12} />
      ) : (
        <Activity size={12} />
      )}
      {Math.abs(pct).toFixed(1)}%
      {label ? <span className="hidden text-[11px] sm:inline">· {label}</span> : null}
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  href,
  trend,
  tone = "default",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  href?: string;
  trend?: { pct: number | null; label?: string };
  tone?: "default" | "blue" | "amber" | "green" | "violet";
}) {
  const toneMap: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };

  const content = (
    <SurfaceCard className="h-full p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneMap[tone]}`}>
            {icon}
          </div>
          {trend ? <TrendBadge pct={trend.pct} label={trend.label} /> : null}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">
            {value}
          </p>
          {sub ? <p className="text-sm text-slate-500">{sub}</p> : null}
        </div>
      </div>
    </SurfaceCard>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600 ring-slate-200",
    ISSUED: "bg-sky-50 text-sky-700 ring-sky-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700 ring-amber-100",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
    RECEIVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  const labels: Record<string, string> = {
    PARTIALLY_PAID: "Partial",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${
        styles[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {labels[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function EmptyState({
  label,
  icon,
}: {
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        {icon ?? <Activity size={20} />}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ListRow({
  title,
  subtitle,
  amount,
  date,
  status,
}: {
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <StatusBadge status={status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
          {amount}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">{date}</p>
      </div>
    </div>
  );
}

function BreakdownBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <p className="text-xs text-slate-500 [font-variant-numeric:tabular-nums]">
          {count} <span className="text-slate-400">({pct}%)</span>
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// page
export default async function DashboardPage() {
  const session = await getSession();
  const userName = session.user?.name ?? "there";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    customerCount,
    supplierCount,
    itemCount,
    currentMonthInvoices,
    lastMonthInvoices,
    outstandingInvoices,
    _pendingComm, // commission module disabled
    recentInvoices,
    recentPurchases,
    lowStockItems,
    invoicesByStatus,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.item.count(),

    prisma.invoice.aggregate({
      where: { issueDate: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      _sum: { totalAed: true },
      _count: true,
    }),

    prisma.invoice.aggregate({
      where: {
        issueDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { not: "CANCELLED" },
      },
      _sum: { totalAed: true },
    }),

    prisma.invoice.aggregate({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      _sum: { totalAed: true },
      _count: true,
    }),

    // Commission module disabled — keep query commented for easy re-enable
    // prisma.commission.aggregate({
    //   where: { isPaid: false },
    //   _sum: { totalPayout: true },
    //   _count: true,
    // }),
    Promise.resolve({ _sum: { totalPayout: null }, _count: 0 }),

    prisma.invoice.findMany({
      take: 5,
      orderBy: { issueDate: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        totalAed: true,
        issueDate: true,
        customer: { select: { name: true } },
      },
    }),

    prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { orderDate: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        totalAed: true,
        orderDate: true,
        supplier: { select: { name: true } },
        payments: { select: { amount: true } },
      },
    }),

    prisma.item.findMany({
      where: { stockQty: { lte: 5 } },
      take: 5,
      orderBy: { stockQty: "asc" },
      select: { id: true, name: true, sku: true, stockQty: true, retailPrice: true },
    }),

    prisma.invoice.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const currentRevenue = Number(currentMonthInvoices._sum.totalAed ?? 0);
  const lastRevenue = Number(lastMonthInvoices._sum.totalAed ?? 0);
  const revenueTrend = pctChange(currentRevenue, lastRevenue);

  const outstandingTotal = Number(outstandingInvoices._sum.totalAed ?? 0);
  // pendingCommTotal unused — commission module disabled
  // const pendingCommTotal = Number(_pendingComm._sum.totalPayout ?? 0);

  const statusMap = Object.fromEntries(invoicesByStatus.map((s) => [s.status, s._count]));
  const paidCount = statusMap["PAID"] ?? 0;
  const issuedCount = statusMap["ISSUED"] ?? 0;
  const draftCount = statusMap["DRAFT"] ?? 0;
  const partialCount = statusMap["PARTIALLY_PAID"] ?? 0;
  const cancelledCount = statusMap["CANCELLED"] ?? 0;
  const totalInvoices =
    paidCount + issuedCount + draftCount + partialCount + cancelledCount;

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const dateLabel = now.toLocaleDateString("en-AE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">
        {/* Header */}
        <SurfaceCard className="overflow-hidden">
          <div className="relative p-5 sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_30%),radial-gradient(circle_at_left,rgba(99,102,241,0.05),transparent_25%)]" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {greeting}, {userName.split(" ")[0]}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/sales"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create invoice
                </Link>
              </div>
            </div>
          </div>
        </SurfaceCard>

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            title="Revenue this month"
            value={formatAED(currentRevenue)}
            sub={`${currentMonthInvoices._count} invoices created`}
            icon={<TrendingUp size={20} />}
            tone="blue"
            trend={{ pct: revenueTrend, label: "vs last month" }}
            href="/sales"
          />

          <KpiCard
            title="Outstanding receivables"
            value={formatAED(outstandingTotal)}
            sub={`${outstandingInvoices._count} invoices unpaid`}
            icon={<AlertCircle size={20} />}
            tone="amber"
            href="/sales"
          />

          {/* Commission KPI hidden — module disabled
          <KpiCard
            title="Pending commissions"
            value={formatAED(pendingCommTotal)}
            sub={`${pendingComm._count} payouts pending`}
            icon={<DollarSign size={20} />}
            tone="violet"
            href="/commissions"
          />
          */}

          <KpiCard
            title="Inventory items"
            value={String(itemCount)}
            sub={`${lowStockItems.length} low stock alerts`}
            icon={<Package size={20} />}
            tone="green"
            href="/inventory"
          />
        </section>

        {/* Secondary stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SurfaceCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Users size={19} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Customers
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                  {customerCount}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Truck size={19} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Suppliers
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                  {supplierCount}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={19} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Paid invoices
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                  {paidCount}
                </p>
                <p className="text-sm text-slate-500">
                  {issuedCount} issued · {draftCount} draft
                </p>
              </div>
            </div>
          </SurfaceCard>
        </section>

        {/* Main content */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <SurfaceCard className="p-5">
            <SectionHeader
              title="Recent invoices"
              subtitle="Latest sales documents"
              href="/sales"
              icon={<FileText size={16} />}
            />

            {recentInvoices.length === 0 ? (
              <EmptyState label="No invoices yet" icon={<FileText size={18} />} />
            ) : (
              <div className="space-y-1">
                {recentInvoices.map((inv) => (
                  <ListRow
                    key={inv.id}
                    title={inv.number}
                    subtitle={inv.customer.name}
                    amount={formatAED(Number(inv.totalAed))}
                    date={formatShortDate(inv.issueDate)}
                    status={inv.status}
                  />
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader
              title="Recent purchases"
              subtitle="Latest supplier orders"
              href="/purchases"
              icon={<ShoppingCart size={16} />}
            />

            {recentPurchases.length === 0 ? (
              <EmptyState label="No purchases yet" icon={<ShoppingCart size={18} />} />
            ) : (
              <div className="space-y-1">
                {recentPurchases.map((po) => {
                  const amtPaid = po.payments.reduce((s, p) => s + Number(p.amount), 0);
                  const showPaid = (po.status === "PAID" || po.status === "PARTIALLY_PAID") && amtPaid > 0;
                  return (
                    <ListRow
                      key={po.id}
                      title={po.number}
                      subtitle={po.supplier.name}
                      amount={formatAED(showPaid ? amtPaid : Number(po.totalAed))}
                      date={formatShortDate(po.orderDate)}
                      status={po.status}
                    />
                  );
                })}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader
              title="Invoice mix"
              subtitle="Current status spread"
              icon={<BarChart3 size={16} />}
            />

            <div className="space-y-4">
              <BreakdownBar
                label="Paid"
                count={paidCount}
                total={totalInvoices}
                color="bg-emerald-500"
              />
              <BreakdownBar
                label="Issued"
                count={issuedCount}
                total={totalInvoices}
                color="bg-sky-500"
              />
              <BreakdownBar
                label="Draft"
                count={draftCount}
                total={totalInvoices}
                color="bg-slate-400"
              />
              <BreakdownBar
                label="Partial"
                count={partialCount}
                total={totalInvoices}
                color="bg-amber-400"
              />
              <BreakdownBar
                label="Cancelled"
                count={cancelledCount}
                total={totalInvoices}
                color="bg-rose-400"
              />
            </div>
          </SurfaceCard>
        </section>

        {/* Lower row */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <SurfaceCard className="p-5">
            <SectionHeader
              title="Low stock alerts"
              subtitle="Items that need attention"
              href="/inventory"
              icon={<AlertCircle size={16} />}
            />

            {lowStockItems.length === 0 ? (
              <EmptyState
                label="All items are well stocked"
                icon={<CheckCircle2 size={18} />}
              />
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.sku}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">
                        <Clock3 size={12} />
                        {Number(item.stockQty)} units left
                      </span>
                      <span className="text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                        {formatAED(Number(item.retailPrice))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader
              title="Quick actions"
              subtitle="Common shortcuts"
            />

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  href: "/sales",
                  label: "New invoice",
                  icon: <FileText size={18} />,
                  tone: "bg-slate-900 text-white hover:bg-slate-800",
                },
                {
                  href: "/purchases",
                  label: "New purchase",
                  icon: <ShoppingCart size={18} />,
                  tone: "bg-indigo-600 text-white hover:bg-indigo-700",
                },
                {
                  href: "/customers",
                  label: "Add customer",
                  icon: <Users size={18} />,
                  tone: "bg-sky-600 text-white hover:bg-sky-700",
                },
                {
                  href: "/inventory",
                  label: "Add item",
                  icon: <Package size={18} />,
                  tone: "bg-emerald-600 text-white hover:bg-emerald-700",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[108px] flex-col items-start justify-between rounded-3xl p-4 text-sm font-semibold shadow-sm transition ${item.tone}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </SurfaceCard>
        </section>
      </div>
    </div>
  );
}