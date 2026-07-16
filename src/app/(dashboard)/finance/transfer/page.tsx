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

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    date: todayStr,
    description: "Account transfer",
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/accounting/journal?accounts=1").then((r) => r.json()),
      fetch("/api/accounting/journal").then((r) => r.json()),
    ]).then(([accs, jnls]) => {
      setAccounts(Array.isArray(accs) ? accs : []);
      // filter only transfers we posted (reference starts with TRF-)
      setTransfers(Array.isArray(jnls) ? jnls.filter((j: any) => j.reference?.startsWith("TRF-")) : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const fromAcc = accounts.find((a) => a.id === form.fromAccountId);
  const toAcc   = accounts.find((a) => a.id === form.toAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fromAccountId || !form.toAccountId) return setError("Select both accounts.");
    if (form.fromAccountId === form.toAccountId) return setError("From and To accounts must be different.");
    if (!form.amount || Number(form.amount) <= 0) return setError("Enter a valid amount.");

    setSaving(true);
    const reference = `TRF-${Date.now()}`;
    const res = await fetch("/api/accounting/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        description: form.description || "Account transfer",
        date: form.date,
        lines: [
          { accountId: form.toAccountId,   type: "DEBIT",  amount: Number(form.amount) },
          { accountId: form.fromAccountId, type: "CREDIT", amount: Number(form.amount) },
        ],
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      return setError(d.error ?? "Failed to post transfer.");
    }

    setSuccess(true);
    setForm({ fromAccountId: "", toAccountId: "", amount: "", date: todayStr, description: "Account transfer" });
    setTimeout(() => setSuccess(false), 3000);
    load();
  };

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Transfer Between Accounts</h1>
              <p className="mt-0.5 text-sm text-slate-500">Move funds from one account to another — posts a balanced journal entry automatically.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* From → To */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]  sm:items-end">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">From Account *</label>
                <select value={form.fromAccountId} onChange={(e) => setForm((f) => ({ ...f, fromAccountId: e.target.value }))} className={inputCls}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                {fromAcc && <p className="mt-1 text-xs text-slate-400">{fromAcc.type}</p>}
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 self-end mx-auto">
                <ArrowRight size={16} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">To Account *</label>
                <select value={form.toAccountId} onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))} className={inputCls}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                {toAcc && <p className="mt-1 text-xs text-slate-400">{toAcc.type}</p>}
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
            {form.fromAccountId && form.toAccountId && form.amount && (
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
                    {["Date", "Reference", "Description", "From", "To", "Amount"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => {
                    const cr  = t.lines?.find((l: any) => l.type === "CREDIT");
                    const dr  = t.lines?.find((l: any) => l.type === "DEBIT");
                    return (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-5 py-3 text-slate-500">{new Date(t.date).toLocaleDateString("en-AE")}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{t.reference}</td>
                        <td className="px-5 py-3 text-slate-700">{t.description}</td>
                        <td className="px-5 py-3 text-slate-600">{cr?.account?.name ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-600">{dr?.account?.name ?? "—"}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums text-slate-900">{formatAED(Number(cr?.aedAmount ?? 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </main>
  );
}
