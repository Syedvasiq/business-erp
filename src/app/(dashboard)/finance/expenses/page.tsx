"use client";

import { useEffect, useState } from "react";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";

const CATEGORIES = [
  "RENT","UTILITIES","SALARIES","TRANSPORT","MARKETING",
  "OFFICE_SUPPLIES","BANK_CHARGES","INSURANCE","MAINTENANCE","OTHER",
];

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

export default function FinanceExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    description: "", category: "OTHER", amount: "",
    date: new Date().toISOString().slice(0, 10), reference: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/expenses").then((r) => r.json()).then((d) => {
      setExpenses(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ description: "", category: "OTHER", amount: "", date: new Date().toISOString().slice(0, 10), reference: "" });
    load();
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Expenses</h1>
                <p className="mt-0.5 text-sm text-slate-500">{expenses.length} records · Total {formatAED(total)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              <Plus size={15} /> Add Expense
            </button>
          </div>
        </Card>

        {loading ? (
          <Card className="p-12 text-center text-sm text-slate-400">Loading…</Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["Date", "Description", "Category", "Reference", "Amount"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">No expenses yet. Click Add Expense to get started.</td></tr>
                  )}
                  {expenses.map((e: any) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(e.date).toLocaleDateString("en-AE")}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">{e.description}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {e.category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-slate-400">{e.reference ?? "—"}</td>
                      <td className="px-5 py-4 text-sm font-bold tabular-nums text-rose-600">{formatAED(Number(e.amount))}</td>
                    </tr>
                  ))}
                  {expenses.length > 0 && (
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={4} className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Total</td>
                      <td className="px-5 py-3 text-sm font-bold tabular-nums text-rose-700">{formatAED(total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>

      {showAdd && (
        <Modal title="Add Expense" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Description *</label>
              <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Office rent - January" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Category</label>
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Amount (AED) *</label>
                <input className={inputCls} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Date</label>
                <input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Reference</label>
              <input className={inputCls} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. INV-001" />
            </div>
            <button onClick={save} disabled={saving || !form.description || !form.amount} className={btnPrimary}>
              {saving ? "Saving…" : "Add Expense"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
