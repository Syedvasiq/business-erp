import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart, Wallet, FileX, Truck } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    "Purchase Order": "bg-sky-50 text-sky-700 ring-sky-100",
    "Payment":        "bg-emerald-50 text-emerald-700 ring-emerald-100",
    "Debit Note":     "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles[type] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {type}
    </span>
  );
}

export default async function SupplierStatementPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchaseOrders: {
        where: { status: { not: "CANCELLED" } },
        include: { payments: { orderBy: { date: "asc" } } },
        orderBy: { orderDate: "asc" },
      },
      creditNotes: { where: { type: "SUPPLIER" }, orderBy: { date: "asc" } },
    },
  });

  if (!supplier) notFound();

  const events: { date: Date; kind: string; data: any }[] = [];

  for (const po of supplier.purchaseOrders) {
    events.push({ date: new Date(po.orderDate), kind: "po", data: po });
    for (const pay of po.payments) {
      events.push({ date: new Date(pay.date), kind: "payment", data: { ...pay, poNumber: po.number } });
    }
  }
  for (const dn of supplier.creditNotes) {
    events.push({ date: new Date(dn.date), kind: "debit", data: dn });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const rows: any[] = [];

  for (const ev of events) {
    if (ev.kind === "po") {
      runningBalance += Number(ev.data.totalAed);
      rows.push({
        date: ev.date, type: "Purchase Order",
        reference: ev.data.number,
        description: "Purchase order received",
        debit: Number(ev.data.totalAed), credit: 0,
        balance: runningBalance, status: ev.data.status,
      });
    } else if (ev.kind === "payment") {
      runningBalance -= Number(ev.data.amount);
      rows.push({
        date: ev.date, type: "Payment",
        reference: ev.data.poNumber,
        description: `Payment via ${ev.data.method?.replace("_", " ")}${ev.data.bankName ? ` · ${ev.data.bankName}` : ""}${ev.data.transactionId ? ` · ${ev.data.transactionId}` : ""}`,
        debit: 0, credit: Number(ev.data.amount),
        balance: runningBalance,
      });
    } else {
      const total = Number(ev.data.amount) + Number(ev.data.vatAmount);
      runningBalance -= total;
      rows.push({
        date: ev.date, type: "Debit Note",
        reference: ev.data.number,
        description: ev.data.reason,
        debit: 0, credit: total,
        balance: runningBalance,
      });
    }
  }

  const totalOrdered = rows.filter((r) => r.type === "Purchase Order").reduce((s, r) => s + r.debit, 0);
  const totalPaid    = rows.filter((r) => r.type === "Payment").reduce((s, r) => s + r.credit, 0);
  const totalDebits  = rows.filter((r) => r.type === "Debit Note").reduce((s, r) => s + r.credit, 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/finance/aged-payables" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Supplier Statement</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{supplier.name}</h1>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                  {supplier.email && <span>{supplier.email}</span>}
                  {supplier.phone && <span>{supplier.phone}</span>}
                  {supplier.trn   && <span className="font-mono">TRN: {supplier.trn}</span>}
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{supplier.vendorType.replace("_", " ")}</span>
                </div>
              </div>
            </div>
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${runningBalance > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
              <Truck size={18} className={runningBalance > 0 ? "text-rose-500" : "text-emerald-500"} />
              <div>
                <p className={`text-xs font-semibold ${runningBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {runningBalance > 0 ? "You Owe" : "Settled"}
                </p>
                <p className={`text-2xl font-bold tabular-nums ${runningBalance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatAED(Math.abs(runningBalance))}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Ordered", value: formatAED(totalOrdered), sub: `${rows.filter((r) => r.type === "Purchase Order").length} POs`, icon: <ShoppingCart size={18} />, color: "bg-sky-50 text-sky-600" },
            { label: "Total Paid",    value: formatAED(totalPaid),    sub: `${rows.filter((r) => r.type === "Payment").length} payments`,   icon: <Wallet size={18} />,       color: "bg-emerald-50 text-emerald-600" },
            { label: "Debit Notes",   value: formatAED(totalDebits),  sub: `${rows.filter((r) => r.type === "Debit Note").length} notes`,   icon: <FileX size={18} />,        color: "bg-rose-50 text-rose-600" },
          ].map(({ label, value, sub, icon, color }) => (
            <Card key={label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
                  <p className="mt-1 text-sm text-slate-500">{sub}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Full Statement</h2>
            <p className="mt-0.5 text-sm text-slate-500">All transactions in chronological order with running balance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Date", "Type", "Reference", "Description", "Debit (AED)", "Credit (AED)", "Balance (AED)"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No transactions found</td></tr>
                )}
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString("en-AE")}
                    </td>
                    <td className="px-5 py-3.5"><TypeBadge type={row.type} /></td>
                    <td className="px-5 py-3.5 font-mono text-sm font-semibold text-slate-700">{row.reference}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 max-w-[220px] truncate">{row.description}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold tabular-nums text-slate-800">
                      {row.debit > 0 ? formatAED(row.debit) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold tabular-nums text-emerald-600">
                      {row.credit > 0 ? formatAED(row.credit) : "—"}
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-bold tabular-nums ${row.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatAED(row.balance)}
                    </td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td colSpan={4} className="px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-600">Closing Balance</td>
                    <td className="px-5 py-4 text-sm font-bold tabular-nums text-slate-800">{formatAED(totalOrdered)}</td>
                    <td className="px-5 py-4 text-sm font-bold tabular-nums text-emerald-600">{formatAED(totalPaid + totalDebits)}</td>
                    <td className={`px-5 py-4 text-base font-bold tabular-nums ${runningBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatAED(runningBalance)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </main>
  );
}
