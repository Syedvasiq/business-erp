"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatAED } from "@/lib/utils";
import { ArrowLeftRight, Plus, Loader2, ArrowLeft, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function AddModal({ accounts, onClose, onSaved }: { accounts: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    bankAccountId: accounts[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    type: "CREDIT",
    reference: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankAccountId || !form.description || !form.amount) return setError("All required fields must be filled.");
    setSaving(true);
    const res = await fetch("/api/finance/bank-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
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
          <h2 className="text-base font-semibold text-slate-900">Add Bank Transaction</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Bank Account *</label>
            <select value={form.bankAccountId} onChange={(e) => setForm((f) => ({ ...f, bankAccountId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.bankName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(["CREDIT", "DEBIT"] as const).map((t) => (
                  <label key={t} className={`flex cursor-pointer items-center justify-center rounded-xl border-2 py-2 text-xs font-semibold transition ${form.type === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    <input type="radio" className="sr-only" value={t} checked={form.type === t} onChange={() => setForm((f) => ({ ...f, type: t }))} />
                    {t === "CREDIT" ? "Money In" : "Money Out"}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description *</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Customer payment received"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Reference</label>
              <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                placeholder="e.g. TXN-001"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BankTransactionsPage() {
  const searchParams  = useSearchParams();
  const filterAccount = searchParams.get("bankAccountId");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(filterAccount ?? "");

  const load = () => {
    setLoading(true);
    const q = selectedAccount ? `?bankAccountId=${selectedAccount}` : "";
    Promise.all([
      fetch(`/api/finance/bank-transactions${q}`).then((r) => r.json()),
      fetch("/api/finance/bank-accounts").then((r) => r.json()),
    ]).then(([txns, accs]) => {
      setTransactions(txns);
      setAccounts(accs);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [selectedAccount]);

  const totalIn  = transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/finance/bank-accounts" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Bank Transactions</h1>
                <p className="mt-0.5 text-sm text-slate-500">{transactions.length} transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400">
                <option value="">All Accounts</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                <Plus size={15} /> Add Transaction
              </button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Money In",  value: formatAED(totalIn),          icon: <ArrowDownCircle size={18} />, color: "bg-emerald-50 text-emerald-600" },
            { label: "Money Out", value: formatAED(totalOut),         icon: <ArrowUpCircle size={18} />,   color: "bg-rose-50 text-rose-600" },
            { label: "Net",       value: formatAED(totalIn - totalOut), icon: <ArrowLeftRight size={18} />, color: totalIn - totalOut >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600" },
          ].map(({ label, value, icon, color }) => (
            <Card key={label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">All Transactions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["Date", "Account", "Description", "Reference", "Type", "Amount", "Reconciled"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No transactions found</td></tr>
                  )}
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">{new Date(t.date).toLocaleDateString("en-AE")}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">{t.bankAccount?.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{t.description}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.reference || "—"}</td>
                      <td className="px-5 py-4">
                        {t.type === "CREDIT"
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><ArrowDownCircle size={11} /> Money In</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700"><ArrowUpCircle size={11} /> Money Out</span>}
                      </td>
                      <td className={`px-5 py-4 text-sm font-semibold tabular-nums ${t.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.type === "CREDIT" ? "+" : "-"}{formatAED(Number(t.amount))}
                      </td>
                      <td className="px-5 py-4">
                        {t.reconciled
                          ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Reconciled</span>
                          : <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>

      {showAdd && accounts.length > 0 && <AddModal accounts={accounts} onClose={() => setShowAdd(false)} onSaved={load} />}
    </main>
  );
}
