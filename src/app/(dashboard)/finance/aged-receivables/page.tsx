"use client";

import { useEffect, useState } from "react";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"><X size={15} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500";
const btnPrimary = "w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";

type Tab = "aged" | "credit-notes";

export default function AccountsReceivablePage() {
  const [tab, setTab]           = useState<Tab>("aged");
  const [aged, setAged]         = useState<any[]>([]);
  const [credits, setCredits]   = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ customerId: "", invoiceId: "", amount: "", vatAmount: "", reason: "", date: new Date().toISOString().slice(0, 10) });
  const [invoices, setInvoices] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/finance/aged-receivables").then((r) => r.json()),
      fetch("/api/finance/credit-notes").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([a, c, custs]) => {
      setAged(a);
      setCredits(c);
      setCustomers(Array.isArray(custs) ? custs : (custs.customers ?? []));
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  // load invoices when customer changes
  useEffect(() => {
    if (!form.customerId) { setInvoices([]); return; }
    fetch(`/api/sales?customerId=${form.customerId}`).then((r) => r.json()).then((d) => setInvoices(Array.isArray(d) ? d : (d.invoices ?? [])));
  }, [form.customerId]);

  const saveCreditNote = async () => {
    setSaving(true);
    await fetch("/api/finance/credit-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), vatAmount: Number(form.vatAmount || 0) }),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ customerId: "", invoiceId: "", amount: "", vatAmount: "", reason: "", date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const grandBalance  = aged.reduce((s: number, r: any) => s + r.b1_30 + r.b31_60 + r.b61_90 + r.over90, 0);
  const totalInvoiced = aged.reduce((s: number, r: any) => s + r.totalInvoiced, 0);
  const totalPaid     = aged.reduce((s: number, r: any) => s + r.totalPaid, 0);
  const creditTotal   = credits.reduce((s: number, c: any) => s + c.amount + c.vatAmount, 0);

  const buckets = [
    { key: "b1_30",  label: "1–30 Days",    color: "text-amber-600" },
    { key: "b31_60", label: "31–60 Days",   color: "text-orange-600" },
    { key: "b61_90", label: "61–90 Days",   color: "text-rose-600" },
    { key: "over90", label: "Over 90 Days", color: "text-red-700" },
  ];

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><ArrowLeft size={16} /></Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Accounts Receivable</h1>
                <p className="mt-0.5 text-sm text-slate-500">{aged.length} customers outstanding · Balance {formatAED(grandBalance)}</p>
              </div>
            </div>
            {tab === "credit-notes" && (
              <button onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                <Plus size={15} /> Add Credit Note
              </button>
            )}
          </div>
        </Card>

        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 w-fit">
          {([["aged", "Aged Receivables"], ["credit-notes", "Credit Notes"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${tab === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <Card className="p-12 text-center text-sm text-slate-400">Loading…</Card>
        ) : tab === "aged" ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {buckets.map(({ key, label, color }) => (
                <Card key={key} className="p-5">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${color}`}>{label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{formatAED(aged.reduce((s: number, r: any) => s + r[key], 0))}</p>
                </Card>
              ))}
            </div>
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">By Customer</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Customer", "1–30 Days", "31–60 Days", "61–90 Days", "Over 90", "Total Invoiced", "Total Paid", "Balance Due"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aged.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">No outstanding receivables</td></tr>}
                    {aged.map((r: any) => {
                      const rowTotal = r.b1_30 + r.b31_60 + r.b61_90 + r.over90;
                      return (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="px-5 py-4"><Link href={`/finance/customers/${r.id}`} className="text-sm font-semibold text-slate-900 hover:text-sky-700 hover:underline">{r.name}</Link></td>
                          <td className="px-5 py-4 text-sm tabular-nums text-amber-600">{r.b1_30 > 0 ? formatAED(r.b1_30) : "—"}</td>
                          <td className="px-5 py-4 text-sm tabular-nums text-orange-600">{r.b31_60 > 0 ? formatAED(r.b31_60) : "—"}</td>
                          <td className="px-5 py-4 text-sm tabular-nums text-rose-600">{r.b61_90 > 0 ? formatAED(r.b61_90) : "—"}</td>
                          <td className="px-5 py-4 text-sm tabular-nums text-red-700">{r.over90 > 0 ? formatAED(r.over90) : "—"}</td>
                          <td className="px-5 py-4 text-sm tabular-nums text-slate-600">{formatAED(r.totalInvoiced)}</td>
                          <td className="px-5 py-4 text-sm tabular-nums text-emerald-600">{formatAED(r.totalPaid)}</td>
                          <td className="px-5 py-4 text-sm font-bold tabular-nums text-rose-700">{formatAED(rowTotal)}</td>
                        </tr>
                      );
                    })}
                    {aged.length > 0 && (
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Total</td>
                        {buckets.map(({ key }) => <td key={key} className="px-5 py-3 text-sm font-bold tabular-nums text-slate-800">{formatAED(aged.reduce((s: number, r: any) => s + r[key], 0))}</td>)}
                        <td className="px-5 py-3 text-sm font-bold tabular-nums text-slate-600">{formatAED(totalInvoiced)}</td>
                        <td className="px-5 py-3 text-sm font-bold tabular-nums text-emerald-700">{formatAED(totalPaid)}</td>
                        <td className="px-5 py-3 text-sm font-bold tabular-nums text-rose-700">{formatAED(grandBalance)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Customer Credit Notes</h2>
              <span className="text-sm text-slate-500">{credits.length} notes · Total {formatAED(creditTotal)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["CN Number", "Date", "Customer", "Against Invoice", "Amount", "VAT", "Total", "Reason"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {credits.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">No credit notes yet</td></tr>}
                  {credits.map((cn: any) => (
                    <tr key={cn.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-rose-600">{cn.number}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(cn.date).toLocaleDateString("en-AE")}</td>
                      <td className="px-5 py-4">
                        {cn.customerId ? <Link href={`/finance/customers/${cn.customerId}`} className="text-sm font-medium text-slate-800 hover:text-sky-700 hover:underline">{cn.customerName}</Link> : "—"}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-sky-700">{cn.invoiceNumber ?? "—"}</td>
                      <td className="px-5 py-4 text-sm tabular-nums text-slate-700">{formatAED(cn.amount)}</td>
                      <td className="px-5 py-4 text-sm tabular-nums text-slate-500">{formatAED(cn.vatAmount)}</td>
                      <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-900">{formatAED(cn.amount + cn.vatAmount)}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 max-w-[180px] truncate">{cn.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>

      {showAdd && (
        <Modal title="Add Credit Note" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Customer *</label>
              <select className={inputCls} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, invoiceId: "" })}>
                <option value="">Select customer…</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {invoices.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Against Invoice (optional)</label>
                <select className={inputCls} value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
                  <option value="">None</option>
                  {invoices.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.number}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Amount (AED) *</label>
                <input className={inputCls} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">VAT (AED)</label>
                <input className={inputCls} type="number" min="0" step="0.01" value={form.vatAmount} onChange={(e) => setForm({ ...form, vatAmount: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Date</label>
              <input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Reason *</label>
              <input className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Returned goods" />
            </div>
            <button onClick={saveCreditNote} disabled={saving || !form.customerId || !form.amount || !form.reason} className={btnPrimary}>
              {saving ? "Saving…" : "Create Credit Note"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
