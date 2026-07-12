"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Loader2, ArrowLeft, X, Pause, Play } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

const FREQUENCIES = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];
const TYPES = ["INVOICE", "EXPENSE"];

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    type: "EXPENSE", name: "", frequency: "MONTHLY",
    nextRunDate: new Date().toISOString().slice(0, 10),
    description: "", amount: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) return setError("Name and amount are required.");
    setSaving(true);
    const res = await fetch("/api/finance/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        name: form.name,
        frequency: form.frequency,
        nextRunDate: form.nextRunDate,
        payload: { description: form.description, amount: Number(form.amount) },
      }),
    });
    setSaving(false);
    if (!res.ok) return setError("Failed to save.");
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">New Recurring Template</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => (
              <label key={t} className={`flex cursor-pointer items-center justify-center rounded-xl border-2 py-2.5 text-sm font-semibold transition ${form.type === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                <input type="radio" className="sr-only" value={t} checked={form.type === t} onChange={() => setForm((f) => ({ ...f, type: t }))} />
                {t}
              </label>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Template Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Monthly Office Rent"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400">
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Next Run Date</label>
              <input type="date" value={form.nextRunDate} onChange={(e) => setForm((f) => ({ ...f, nextRunDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Office rent payment"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount (AED) *</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/finance/recurring").then((r) => r.json()).then((d) => { setTemplates(d); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/finance/recurring/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  };

  const FREQ_COLORS: Record<string, string> = {
    WEEKLY: "bg-sky-50 text-sky-700", MONTHLY: "bg-violet-50 text-violet-700",
    QUARTERLY: "bg-amber-50 text-amber-700", YEARLY: "bg-emerald-50 text-emerald-700",
  };

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Recurring Templates</h1>
                <p className="mt-0.5 text-sm text-slate-500">Auto-generate invoices and expenses on a schedule</p>
              </div>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              <Plus size={15} /> New Template
            </button>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
              <RefreshCw size={16} className="text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">All Templates</h2>
            </div>
            {templates.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <RefreshCw size={28} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-400">No recurring templates yet</p>
                <button onClick={() => setShowAdd(true)} className="mt-2 text-sm font-semibold text-sky-600 hover:underline">Create your first template</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Name", "Type", "Frequency", "Amount", "Next Run", "Status", ""].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">{t.name}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.type === "INVOICE" ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-700"}`}>{t.type}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${FREQ_COLORS[t.frequency] ?? "bg-slate-100 text-slate-600"}`}>{t.frequency}</span>
                        </td>
                        <td className="px-5 py-4 text-sm tabular-nums text-slate-700">
                          AED {Number((t.payload as any)?.amount ?? 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{new Date(t.nextRunDate).toLocaleDateString("en-AE")}</td>
                        <td className="px-5 py-4">
                          {t.isActive
                            ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Active</span>
                            : <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Paused</span>}
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={() => toggle(t.id, t.isActive)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${t.isActive ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                            {t.isActive ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </main>
  );
}
