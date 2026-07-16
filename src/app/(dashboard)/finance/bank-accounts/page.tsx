"use client";

import { useEffect, useState } from "react";
import { formatAED } from "@/lib/utils";
import { Building2, Plus, Loader2, ArrowLeft, X, Pencil, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR"];

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20";

function AccountModal({ account, onClose, onSaved }: { account?: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!account;
  const [form, setForm] = useState({
    name: account?.name ?? "",
    bankName: account?.bankName ?? "",
    accountNumber: account?.accountNumber ?? "",
    currency: account?.currency ?? "AED",
    openingBalance: account?.openingBalance ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.bankName) return setError("Account name and bank name are required.");
    setSaving(true);
    const res = isEdit
      ? await fetch(`/api/finance/bank-accounts/${account.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, bankName: form.bankName, accountNumber: form.accountNumber }),
        })
      : await fetch("/api/finance/bank-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, openingBalance: Number(form.openingBalance) || 0 }),
        });
    setSaving(false);
    if (!res.ok) return setError("Failed to save.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? "Edit Bank Account" : "Add Bank Account"}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {[
            { label: "Account Name *", key: "name",          placeholder: "e.g. Emirates NBD Current" },
            { label: "Bank Name *",    key: "bankName",       placeholder: "e.g. Emirates NBD" },
            { label: "Account Number", key: "accountNumber",  placeholder: "e.g. 1234567890" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} className={inputCls} />
            </div>
          ))}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Currency</label>
                <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Opening Balance</label>
                <input type="number" step="0.01" min="0" value={form.openingBalance}
                  onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                  placeholder="0.00" className={inputCls} />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/finance/bank-accounts").then((r) => r.json()).then((d) => { setAccounts(d); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const totalBalance = accounts.reduce((s, a) => s + (a.currentBalance ?? 0), 0);

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
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Bank Accounts</h1>
                <p className="mt-0.5 text-sm text-slate-500">{accounts.length} accounts · Total {formatAED(totalBalance)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/finance/transfer"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <ArrowLeftRight size={15} /> Transfer
              </Link>
              <button onClick={() => { setEditTarget(null); setShowAdd(true); }}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                <Plus size={15} /> Add Bank Account
              </button>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.length === 0 && (
              <Card className="col-span-full p-12 text-center">
                <Building2 size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-400">No bank accounts added yet</p>
                <button onClick={() => setShowAdd(true)} className="mt-3 text-sm font-semibold text-sky-600 hover:underline">Add your first account</button>
              </Card>
            )}
            {accounts.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{a.name}</p>
                    <p className="text-sm text-slate-500">{a.bankName}</p>
                    {a.accountNumber && <p className="font-mono text-xs text-slate-400 mt-0.5">{a.accountNumber}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{a.currency}</span>
                    <button onClick={() => { setEditTarget(a); setShowAdd(true); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                      <Pencil size={12} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Opening Balance</span>
                    <span className="font-medium tabular-nums text-slate-700">{formatAED(Number(a.openingBalance))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Transactions</span>
                    <span className="font-medium text-slate-700">{a.transactionCount}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="text-sm font-semibold text-slate-700">Current Balance</span>
                    <span className={`text-base font-bold tabular-nums ${a.currentBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatAED(a.currentBalance)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/finance/bank-transactions?bankAccountId=${a.id}`}
                    className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    View Transactions
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>

      {showAdd && <AccountModal account={editTarget} onClose={() => { setShowAdd(false); setEditTarget(null); }} onSaved={load} />}
    </main>
  );
}
