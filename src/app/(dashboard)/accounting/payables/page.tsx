import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, FileX, DollarSign, Clock, CheckCircle, Wallet } from "lucide-react";
import { CreditNoteButton } from "../CreditNoteButton";
import { MarkPaidButton } from "../MarkPaidButton";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, sub, icon, tone }: {
  title: string; value: string; sub?: string; icon: React.ReactNode;
  tone: "blue" | "emerald" | "rose" | "amber" | "violet";
}) {
  const tones = {
    blue: "bg-sky-50 text-sky-700", emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

function OverdueBadge({ days }: { days: number }) {
  if (days <= 0) return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">On time</span>;
  if (days <= 30) return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">{days}d overdue</span>;
  return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">{days}d overdue</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PARTIALLY_PAID") return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">Partial</span>;
  if (status === "RECEIVED") return <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">Unpaid</span>;
  return null;
}

function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const balance = Math.max(0, total - paid);
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-emerald-600">{formatAED(paid)}</span>
        <span className="text-slate-400">of {formatAED(total)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-slate-200"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {balance > 0 && (
        <p className="mt-1 text-[11px] text-rose-500 font-medium">Balance: {formatAED(balance)}</p>
      )}
    </div>
  );
}

export default async function PayablesPage() {
  const today = new Date();

  const [orders, paidOrders, creditNotes, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["RECEIVED", "PARTIALLY_PAID"] } },
      include: { supplier: true, payments: { orderBy: { date: "asc" } } },
      orderBy: { orderDate: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["PAID", "PARTIALLY_PAID"] } },
      include: { supplier: true, payments: { orderBy: { date: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.creditNote.findMany({
      where: { type: "SUPPLIER" },
      include: { supplier: true, purchaseOrder: true },
      orderBy: { date: "desc" },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalAP       = orders.reduce((s, po) => s + Number(po.totalAed), 0);
  const totalPaidSoFar = orders.reduce((s, po) => s + po.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0);
  const totalBalance  = totalAP - totalPaidSoFar;
  const totalCN       = creditNotes.reduce((s, cn) => s + Number(cn.amount) + Number(cn.vatAmount), 0);
  const partialCount  = orders.filter((po) => po.status === "PARTIALLY_PAID").length;

  const poOptions = orders.map((po) => ({
    id: po.id, number: po.number,
    supplierName: po.supplier.name, total: Number(po.totalAed),
  }));

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/accounting" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Accounting</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Accounts Payable</h1>
                <p className="mt-1 text-sm text-slate-500">Outstanding purchase orders — record payments or raise debit notes</p>
              </div>
            </div>
            <CreditNoteButton type="SUPPLIER" suppliers={suppliers} purchaseOrders={poOptions} />
          </div>
        </Card>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Outstanding POs"   value={String(orders.length)}       sub={`${partialCount} partially paid`}   icon={<ShoppingCart size={20} />} tone="amber" />
          <StatCard title="Total AP"          value={formatAED(totalAP)}          sub="Gross payable"                      icon={<DollarSign size={20} />}   tone="amber" />
          <StatCard title="Paid So Far"       value={formatAED(totalPaidSoFar)}   sub="Across outstanding POs"             icon={<Wallet size={20} />}       tone="emerald" />
          <StatCard title="Balance Remaining" value={formatAED(totalBalance)}     sub="Still owed to suppliers"            icon={<Clock size={20} />}        tone="rose" />
          <StatCard title="Debit Notes"       value={formatAED(totalCN)}          sub={`${creditNotes.length} notes`}      icon={<FileX size={20} />}        tone="violet" />
        </section>

        {/* Outstanding POs */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Outstanding Purchase Orders</h2>
            <p className="mt-1 text-sm text-slate-500">{orders.length} POs · {partialCount} partially paid · Balance {formatAED(totalBalance)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["PO Number", "Supplier", "Order Date", "Overdue", "Status", "Total", "Paid / Balance", "Action"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No outstanding payables — all clear!</td></tr>
                )}
                {orders.map((po) => {
                  const days    = Math.floor((today.getTime() - new Date(po.orderDate).getTime()) / 86400000);
                  const paid    = po.payments.reduce((s, p) => s + Number(p.amount), 0);
                  const total   = Number(po.totalAed);
                  return (
                    <tr key={po.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-sky-700">{po.number}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">{po.supplier.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(po.orderDate).toLocaleDateString("en-AE")}</td>
                      <td className="px-5 py-4"><OverdueBadge days={days} /></td>
                      <td className="px-5 py-4"><StatusBadge status={po.status} /></td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(total)}</td>
                      <td className="px-5 py-4"><PaymentProgress paid={paid} total={total} /></td>
                      <td className="px-5 py-4">
                        <MarkPaidButton
                          purchaseOrderId={po.id}
                          poTotal={total}
                          paidSoFar={paid}
                          label="Record Payment"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Paid POs */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Paid Purchase Orders</h2>
            <p className="mt-1 text-sm text-slate-500">{paidOrders.length} POs · Last 20</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["PO Number", "Supplier", "Order Date", "Amount Paid", "Payment Method", "Status", "Paid On"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidOrders.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No paid POs yet</td></tr>
                )}
                {paidOrders.map((po) => {
                  const amtPaid = po.payments.reduce((s, p) => s + Number(p.amount), 0);
                  const lastPay = po.payments[po.payments.length - 1];
                  return (
                    <tr key={po.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-700">{po.number}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">{po.supplier.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(po.orderDate).toLocaleDateString("en-AE")}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-emerald-600 [font-variant-numeric:tabular-nums]">{formatAED(amtPaid)}</td>
                      <td className="px-5 py-4">
                        {lastPay
                          ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{lastPay.method.replace("_", " ")}</span>
                          : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        {po.status === "PAID"
                          ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">Fully Paid</span>
                          : <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">Partially Paid</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {lastPay ? new Date(lastPay.date).toLocaleDateString("en-AE") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Supplier Debit Notes */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Supplier Debit Notes</h2>
            <p className="mt-1 text-sm text-slate-500">{creditNotes.length} debit notes raised against purchase orders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["DN Number", "Against PO", "Supplier", "Date", "Amount", "VAT", "Total", "Reason"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creditNotes.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No debit notes raised yet</td></tr>
                )}
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-rose-600">{cn.number}</td>
                    <td className="px-5 py-4">
                      {cn.purchaseOrder
                        ? <span className="font-mono text-sm font-semibold text-sky-700">{cn.purchaseOrder.number}</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{cn.supplier?.name ?? "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{new Date(cn.date).toLocaleDateString("en-AE")}</td>
                    <td className="px-5 py-4 text-sm text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(Number(cn.amount))}</td>
                    <td className="px-5 py-4 text-sm text-slate-700 [font-variant-numeric:tabular-nums]">{formatAED(Number(cn.vatAmount))}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">{formatAED(Number(cn.amount) + Number(cn.vatAmount))}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 max-w-[200px] truncate">{cn.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </main>
  );
}
