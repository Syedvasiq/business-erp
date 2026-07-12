"use client";

import { useEffect, useState } from "react";
import { formatAED } from "@/lib/utils";
import { ArrowLeft, Plus, X, Pencil, Trash2, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import Link from "next/link";

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

export default function ProfitSharingPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [netProfit, setNetProfit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [wdTarget, setWdTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", sharePercent: "" });
  const [wd, setWd] = useState({ amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/finance/partners").then((r) => r.json()),
      fetch("/api/finance/reports?report=pl").then((r) => r.json()),
    ]).then(([p, pl]) => {
      setPartners(p);
      setNetProfit(pl.netProfit ?? 0);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const totalSharePct = partners.reduce((s, p) => s + Number(p.sharePercent), 0);

  const savePartner = async () => {
    setSaving(true);
    const url = editTarget ? `/api/finance/partners/${editTarget.id}` : "/api/finance/partners";
    const method = editTarget ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sharePercent: Number(form.sharePercent) }),
    });
    setSaving(false);
    setShowAdd(false);
    setEditTarget(null);
    setForm({ name: "", email: "", sharePercent: "" });
    load();
  };

  const deletePartner = async (id: string) => {
    if (!confirm("Delete this partner?")) return;
    await fetch(`/api/finance/partners/${id}`, { method: "DELETE" });
    load();
  };

  const saveWithdrawal = async () => {
    setSaving(true);
    await fetch("/api/finance/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: wdTarget.id, ...wd, amount: Number(wd.amount) }),
    });
    setSaving(false);
    setWdTarget(null);
    setWd({ amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const openEdit = (p: any) => {
    setForm({ name: p.name, email: p.email ?? "", sharePercent: String(p.sharePercent) });
    setEditTarget(p);
    setShowAdd(true);
  };

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
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Profit Sharing</h1>
                <p className="mt-0.5 text-sm text-slate-500">{partners.length} partners · {totalSharePct}% allocated · Net Profit {formatAED(netProfit)}</p>
              </div>
            </div>
            <button
              onClick={() => { setForm({ name: "", email: "", sharePercent: "" }); setEditTarget(null); setShowAdd(true); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              <Plus size={15} /> Add Partner
            </button>
          </div>
        </Card>

        {loading ? (
          <Card className="p-12 text-center text-sm text-slate-400">Loading…</Card>
        ) : partners.length === 0 ? (
          <Card className="p-12 text-center text-sm text-slate-400">No partners yet. Click Add Partner to get started.</Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {partners.map((p) => {
                const withdrawn   = p.withdrawals.reduce((s: number, w: any) => s + Number(w.amount), 0);
                const entitlement = (netProfit * Number(p.sharePercent)) / 100;
                const balanceDue  = entitlement - withdrawn;
                return (
                  <Card key={p.id} className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{p.name}</p>
                        {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700 ring-1 ring-violet-100">{Number(p.sharePercent)}%</span>
                        <button onClick={() => openEdit(p)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"><Pencil size={12} /></button>
                        <button onClick={() => deletePartner(p.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={12} /></button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        { icon: <TrendingUp size={13} />, label: "Profit Entitlement", value: formatAED(entitlement), color: "text-sky-700" },
                        { icon: <Wallet size={13} />,     label: "Total Withdrawn",    value: formatAED(withdrawn),   color: "text-emerald-600" },
                        { icon: <AlertCircle size={13} />,label: "Balance Due",        value: formatAED(balanceDue),  color: balanceDue > 0 ? "text-rose-600" : "text-emerald-600" },
                      ].map(({ icon, label, value, color }) => (
                        <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><span className={color}>{icon}</span>{label}</div>
                          <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => setWdTarget(p)}
                      className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                      + Record Withdrawal
                    </button>

                    {p.withdrawals.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Withdrawals</p>
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {p.withdrawals.map((w: any) => (
                            <div key={w.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                              <span className="text-slate-500">{new Date(w.date).toLocaleDateString("en-AE")}</span>
                              {w.note && <span className="max-w-[100px] truncate text-slate-400">{w.note}</span>}
                              <span className="font-semibold text-rose-600">{formatAED(Number(w.amount))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Partner", "Share %", "Net Profit Base", "Entitlement", "Withdrawn", "Balance Due"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((p) => {
                      const withdrawn   = p.withdrawals.reduce((s: number, w: any) => s + Number(w.amount), 0);
                      const entitlement = (netProfit * Number(p.sharePercent)) / 100;
                      const balanceDue  = entitlement - withdrawn;
                      return (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">{p.name}</td>
                          <td className="px-5 py-4 text-sm font-bold text-violet-700">{Number(p.sharePercent)}%</td>
                          <td className="px-5 py-4 text-sm tabular-nums text-slate-600">{formatAED(netProfit)}</td>
                          <td className="px-5 py-4 text-sm font-semibold tabular-nums text-sky-700">{formatAED(entitlement)}</td>
                          <td className="px-5 py-4 text-sm tabular-nums text-emerald-600">{formatAED(withdrawn)}</td>
                          <td className={`px-5 py-4 text-sm font-bold tabular-nums ${balanceDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatAED(balanceDue)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Total</td>
                      <td className="px-5 py-3 text-sm font-bold text-violet-700">{totalSharePct}%</td>
                      <td className="px-5 py-3" />
                      <td className="px-5 py-3 text-sm font-bold tabular-nums text-sky-700">
                        {formatAED(partners.reduce((s, p) => s + (netProfit * Number(p.sharePercent)) / 100, 0))}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold tabular-nums text-emerald-700">
                        {formatAED(partners.reduce((s, p) => s + p.withdrawals.reduce((ws: number, w: any) => ws + Number(w.amount), 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold tabular-nums text-rose-700">
                        {formatAED(partners.reduce((s, p) => {
                          const e = (netProfit * Number(p.sharePercent)) / 100;
                          const w = p.withdrawals.reduce((ws: number, wd: any) => ws + Number(wd.amount), 0);
                          return s + (e - w);
                        }, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

      </div>

      {/* Add / Edit Partner Modal */}
      {showAdd && (
        <Modal title={editTarget ? "Edit Partner" : "Add Partner"} onClose={() => { setShowAdd(false); setEditTarget(null); }}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Full Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ahmed Al Mansoori" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="partner@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Share % *</label>
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.sharePercent} onChange={(e) => setForm({ ...form, sharePercent: e.target.value })} placeholder="e.g. 50" />
            </div>
            <button onClick={savePartner} disabled={saving || !form.name || !form.sharePercent} className={btnPrimary}>
              {saving ? "Saving…" : editTarget ? "Update Partner" : "Add Partner"}
            </button>
          </div>
        </Modal>
      )}

      {/* Withdrawal Modal */}
      {wdTarget && (
        <Modal title={`Withdrawal — ${wdTarget.name}`} onClose={() => setWdTarget(null)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Amount (AED) *</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={wd.amount} onChange={(e) => setWd({ ...wd, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Date</label>
              <input className={inputCls} type="date" value={wd.date} onChange={(e) => setWd({ ...wd, date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Note</label>
              <input className={inputCls} value={wd.note} onChange={(e) => setWd({ ...wd, note: e.target.value })} placeholder="e.g. Monthly draw" />
            </div>
            <button onClick={saveWithdrawal} disabled={saving || !wd.amount} className={btnPrimary}>
              {saving ? "Saving…" : "Record Withdrawal"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
