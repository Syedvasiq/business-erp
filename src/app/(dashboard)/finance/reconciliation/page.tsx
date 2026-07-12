"use client";

import { useEffect, useState } from "react";
import { formatAED } from "@/lib/utils";
import { GitMerge, Loader2, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export default function ReconciliationPage() {
  const [accounts, setAccounts]         = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payments, setPayments]         = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/finance/bank-accounts").then((r) => r.json()).then(setAccounts);
    Promise.all([
      fetch("/api/finance/payments-received").then((r) => r.json()),
      fetch("/api/finance/payments-made").then((r) => r.json()),
    ]).then(([rec, made]) => setPayments([...rec, ...made]));
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);
    fetch(`/api/finance/bank-transactions?bankAccountId=${selectedAccount}`)
      .then((r) => r.json())
      .then((d) => { setTransactions(d); setLoading(false); });
  }, [selectedAccount]);

  const unreconciled = transactions.filter((t) => !t.reconciled);
  const reconciled   = transactions.filter((t) => t.reconciled);

  const markReconciled = async (txnId: string, paymentId?: string) => {
    setSaving(txnId);
    await fetch(`/api/finance/bank-transactions/${txnId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reconciled: true, paymentId: paymentId || null }),
    });
    setSaving(null);
    fetch(`/api/finance/bank-transactions?bankAccountId=${selectedAccount}`)
      .then((r) => r.json()).then(setTransactions);
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
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Bank Reconciliation</h1>
                <p className="mt-0.5 text-sm text-slate-500">Match bank transactions to payments</p>
              </div>
            </div>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 min-w-[220px]">
              <option value="">Select bank account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.bankName}</option>)}
            </select>
          </div>
        </Card>

        {!selectedAccount && (
          <Card className="p-12 text-center">
            <GitMerge size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">Select a bank account above to start reconciliation</p>
          </Card>
        )}

        {selectedAccount && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Total Transactions", value: String(transactions.length),   color: "bg-sky-50 text-sky-600" },
                { label: "Reconciled",         value: String(reconciled.length),     color: "bg-emerald-50 text-emerald-600" },
                { label: "Pending",            value: String(unreconciled.length),   color: "bg-amber-50 text-amber-600" },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${color.split(" ")[1]}`}>{value}</p>
                </Card>
              ))}
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Unreconciled Transactions</h2>
                <p className="mt-0.5 text-sm text-slate-500">Match each transaction to a payment or mark as reconciled</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {unreconciled.length === 0 && (
                    <div className="flex items-center gap-3 px-6 py-10 text-sm text-emerald-600">
                      <CheckCircle2 size={18} /> All transactions reconciled
                    </div>
                  )}
                  {unreconciled.map((t) => {
                    const matchingPayments = payments.filter((p) => {
                      const amt = Math.abs(Number(p.amount) - Number(t.amount)) < 0.01;
                      if (t.type === "CREDIT") return amt && p.invoiceId;
                      return amt && p.purchaseOrderId;
                    });
                    return (
                      <div key={t.id} className="px-6 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Circle size={14} className="text-amber-400" />
                              <span className="text-sm font-semibold text-slate-800">{t.description}</span>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${t.type === "CREDIT" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {t.type === "CREDIT" ? "IN" : "OUT"}
                              </span>
                            </div>
                            <p className="mt-0.5 ml-5 text-xs text-slate-400">
                              {new Date(t.date).toLocaleDateString("en-AE")} · {t.reference || "No ref"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-5 sm:ml-0">
                            <span className={`text-base font-bold tabular-nums ${t.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                              {formatAED(Number(t.amount))}
                            </span>
                            {matchingPayments.length > 0 ? (
                              <select
                                defaultValue=""
                                onChange={(e) => { if (e.target.value) markReconciled(t.id, e.target.value); }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-400"
                              >
                                <option value="">Match to payment…</option>
                                {matchingPayments.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.invoice?.number || p.purchaseOrder?.number} · {formatAED(Number(p.amount))}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            <button
                              onClick={() => markReconciled(t.id)}
                              disabled={saving === t.id}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {saving === t.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              Reconcile
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {reconciled.length > 0 && (
              <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Reconciled Transactions</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {reconciled.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-sm text-slate-700">{t.description}</span>
                        <span className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString("en-AE")}</span>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${t.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatAED(Number(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

      </div>
    </main>
  );
}
