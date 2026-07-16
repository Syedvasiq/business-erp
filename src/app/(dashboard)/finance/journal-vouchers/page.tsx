"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatAED } from "@/lib/utils";
import { Plus, Trash2, Loader2, BookMarked, ArrowLeft } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

type Line = { accountId: string; type: "DEBIT" | "CREDIT"; amount: string };

export default function JournalVouchersPage() {
  const router = useRouter();
  const [accounts, setAccounts]   = useState<any[]>([]);
  const [journals, setJournals]   = useState<any[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const [description, setDescription] = useState("");
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines]             = useState<Line[]>([
    { accountId: "", type: "DEBIT",  amount: "" },
    { accountId: "", type: "CREDIT", amount: "" },
  ]);

  useEffect(() => {
    fetch("/api/accounting/journal?accounts=1").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setAccounts(d);
    });
    fetch("/api/accounting/journal").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setJournals(d);
    });
  }, []);

  const addLine = () => setLines((l) => [...l, { accountId: "", type: "DEBIT", amount: "" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof Line, value: string) =>
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));

  const totalDr = lines.filter((l) => l.type === "DEBIT").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalCr = lines.filter((l) => l.type === "CREDIT").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!description.trim()) return setError("Description is required.");
    if (!balanced) return setError("Journal must be balanced — total debits must equal total credits.");
    if (lines.some((l) => !l.accountId || !l.amount)) return setError("All lines must have an account and amount.");

    setSaving(true);
    const reference = `JV-${Date.now()}`;
    const res = await fetch("/api/accounting/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        description,
        date,
        lines: lines.map((l) => ({ ...l, amount: Number(l.amount) })),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      return setError(d.error ?? "Failed to save journal.");
    }

    setShowForm(false);
    setDescription(""); setDate(new Date().toISOString().slice(0, 10));
    setLines([{ accountId: "", type: "DEBIT", amount: "" }, { accountId: "", type: "CREDIT", amount: "" }]);
    router.refresh();
    // reload journals
    fetch("/api/accounting/journal").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setJournals(d);
    });
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
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Journal Vouchers</h1>
                <p className="mt-0.5 text-sm text-slate-500">Manual double-entry journal entries</p>
              </div>
            </div>
            <button onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              <Plus size={15} /> New Journal Entry
            </button>
          </div>
        </Card>

        {/* New entry form */}
        {showForm && (
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">New Journal Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Description *</label>
                  <input value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Depreciation adjustment"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20" />
                </div>
              </div>

              {/* Lines */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Account", "Type", "Amount (AED)", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-2.5">
                          <select value={line.accountId} onChange={(e) => updateLine(i, "accountId", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400">
                            <option value="">Select account…</option>
                            {accounts.map((a: any) => (
                              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <select value={line.type} onChange={(e) => updateLine(i, "type", e.target.value as "DEBIT" | "CREDIT")}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400">
                            <option value="DEBIT">Debit</option>
                            <option value="CREDIT">Credit</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input type="number" step="0.01" min="0" value={line.amount}
                            onChange={(e) => updateLine(i, "amount", e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" />
                        </td>
                        <td className="px-4 py-2.5">
                          {lines.length > 2 && (
                            <button type="button" onClick={() => removeLine(i)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">Totals</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-4 text-xs font-semibold">
                          <span className={totalDr > 0 ? "text-emerald-600" : "text-slate-400"}>DR {formatAED(totalDr)}</span>
                          <span className={totalCr > 0 ? "text-sky-600" : "text-slate-400"}>CR {formatAED(totalCr)}</span>
                          {!balanced && totalDr > 0 && (
                            <span className="text-rose-500">Diff: {formatAED(Math.abs(totalDr - totalCr))}</span>
                          )}
                          {balanced && <span className="text-emerald-600">✓ Balanced</span>}
                        </div>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={addLine}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-800">
                <Plus size={14} /> Add Line
              </button>

              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !balanced}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving…" : "Post Journal"}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Recent journals */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <BookMarked size={16} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Recent Journal Entries</h2>
          </div>
          <p className="px-6 py-4 text-sm text-slate-500">
            View all journal entries in the{" "}
            <Link href="/finance/reports/ledger" className="font-semibold text-sky-600 hover:underline">Account Transactions →</Link>
          </p>
        </Card>

      </div>
    </main>
  );
}
