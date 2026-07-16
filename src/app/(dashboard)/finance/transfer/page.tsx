"use client";

import { useEffect, useState } from "react";
import { formatAED } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20";

export default function TransferPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [transfers, setTransfers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const [form, setForm] = useState({
    fromId: "",
    toId: "",
    amount: "",
    date: todayStr,
    description: "Cash transfer",
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/finance/bank-accounts").then((r) => r.json()),
      fetch("/api/finance/transfer").then((r) => r.json()),
    ]).then(([banks, trfs]) => {
      setBankAccounts(Array.isArray(banks) ? banks : []);
      setTransfers(Array.isArray(trfs) ? trfs : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const fromAcc = bankAccounts.find((a) => a.id === form.fromId);
  const toAcc   = bankAccounts.find((a) => a.id === form.toId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fromId || !form.toId) return setError("Select both accounts.");
    if (form.fromId === form.toId) return setError("From and To accounts must be different.");
    if (!form.amount || Number(form.amount) <= 0) return setError("Enter a valid amount.");

    setSaving(true);
    const res = await fetch("/api/finance/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromId: form.fromId, toId: form.toId, amount: Number(form.amount), date: form.date, description: form.description }),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      return setError(d.error ?? "Failed to post transfer.");
    }

    setSuccess(true);
    setForm({ fromId: "", toId: "", amount: "", date: todayStr, description: "Cash transfer" });
    setTimeout(() => setSuccess(false), 3000);
    load();
  };

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Link href="/finance/bank-accounts" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance · Bank Accounts</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Transfer Between Accounts</h1>
              <p className="mt-0.5 text-sm text-slate-500">Move cash from one bank account to another.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">From Account *</label>
                <select value={form.fromId} onChange={(e) => setForm((f) => ({ ...f, fromId: e.target.value }))} className={inputCls}>
                  <option value="">Select account…</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.bankName}</option>
                  ))}
                </select>
                {fromAcc && (
                  <p className="mt-1 text-xs text-slate-400">
                    Balance: <span className="font-semibold text-slate-600">{formatAED(fromAcc.currentBalance ?? 0)}</span>
                  </p>
                )}
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 self-end mx-auto">
                <ArrowRight size={16} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">To Account *</label>
                <select value={form.toId} onChange={(e) => setForm((f) => ({ ...f, toId: e.target.value }))} className={inputCls}>
                  <option value="">Select account…</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.bankName}</option>
                  ))}
                </select>
                {toAcc && (
                  <p className="mt-1 text-xs text-slate-400">
                    Balance: <span className="font-semibold text-slate-600">{formatAED(toAcc.currentBalance ?? 0)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount (AED) *</label>
                <input type="number" step="0.01" min="0" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
            </div>

            {/* Preview */}
            {form.fromId && form.toId && form.amount && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Transfer <span className="font-bold">{formatAED(Number(form.amount))}</span> from{" "}
                <span className="font-semibold">{fromAcc?.name}</span> →{" "}
                <span className="font-semibold">{toAcc?.name}</span>
              </div>
            )}

            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            {success && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> Transfer posted successfully.
              </div>
            )}

            <div className="flex justify-end border-t border-slate-200 pt-4">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Posting…" : "Post Transfer"}
              </button>
            </div>
          </form>
        </Card>

        {/* Transfer history */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Transfer History</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
          ) : transfers.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No transfers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["Date", "Reference", "From", "To", "Description", "Amount"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-5 py-3 text-slate-500">{new Date(t.date).toLocaleDateString("en-AE")}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{t.reference}</td>
                      <td className="px-5 py-3 text-slate-600">{t.fromAccount?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{t.toAccount?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-700">{t.description}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums text-slate-900">{formatAED(Number(t.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </main>
  );
}
