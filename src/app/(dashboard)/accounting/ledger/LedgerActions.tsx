"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, BookOpen, Trash2, Loader2, AlertCircle } from "lucide-react";

type Account = { id: string; code: string; name: string; type: string };

type Line = { accountId: string; type: "DEBIT" | "CREDIT"; amount: string };

export function LedgerActions({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([
    { accountId: "", type: "DEBIT",  amount: "" },
    { accountId: "", type: "CREDIT", amount: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const totalDr = lines.filter((l) => l.type === "DEBIT").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalCr = lines.filter((l) => l.type === "CREDIT").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLine = () => setLines((prev) => [...prev, { accountId: "", type: "DEBIT", amount: "" }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const close = () => {
    setOpen(false);
    setReference(""); setDescription(""); setDate(new Date().toISOString().slice(0, 10));
    setLines([{ accountId: "", type: "DEBIT", amount: "" }, { accountId: "", type: "CREDIT", amount: "" }]);
    setError("");
  };

  const save = async () => {
    setError("");
    if (!reference.trim()) return setError("Reference is required.");
    if (!description.trim()) return setError("Description is required.");
    if (lines.some((l) => !l.accountId || !l.amount)) return setError("All lines need an account and amount.");
    if (!balanced) return setError(`Journal is not balanced. DR ${totalDr.toFixed(2)} ≠ CR ${totalCr.toFixed(2)}`);

    setSaving(true);
    const res = await fetch("/api/accounting/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: reference.trim(),
        description: description.trim(),
        date,
        lines: lines.map((l) => ({ accountId: l.accountId, type: l.type, amount: Number(l.amount) })),
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body.error ?? "Failed to save journal entry.");
    }
    close();
    router.refresh();
  };

  // Group accounts by type for the optgroup select
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.type] = acc[a.type] ?? []).push(a);
    return acc;
  }, {});

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
      >
        <Plus size={16} /> New Journal Entry
      </Button>

      <Modal open={open} onClose={close} title="">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New Journal Entry</h2>
                <p className="text-sm text-slate-500">Double-entry — debits must equal credits</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Meta fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Reference *"
                placeholder="e.g. JV-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Description *"
                  placeholder="e.g. Owner capital injection"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="w-40">
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Lines */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Journal Lines
              </p>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Account</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 w-28">Type</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 w-36">Amount (AED)</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <select
                            value={line.accountId}
                            onChange={(e) => updateLine(i, { accountId: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="">— Select account —</option>
                            {Object.entries(grouped).map(([type, accs]) => (
                              <optgroup key={type} label={type}>
                                {accs.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.code} · {a.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={line.type}
                            onChange={(e) => updateLine(i, { type: e.target.value as "DEBIT" | "CREDIT" })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="DEBIT">Debit</option>
                            <option value="CREDIT">Credit</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.amount}
                            onChange={(e) => updateLine(i, { amount: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          {lines.length > 2 && (
                            <button
                              onClick={() => removeLine(i)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals */}
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">Total</td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums">
                        <span className={totalDr > 0 ? "text-emerald-700" : "text-slate-400"}>
                          DR {totalDr.toFixed(2)}
                        </span>
                        {" / "}
                        <span className={totalCr > 0 ? "text-sky-700" : "text-slate-400"}>
                          CR {totalCr.toFixed(2)}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                onClick={addLine}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-800 transition"
              >
                <Plus size={13} /> Add line
              </button>
            </div>

            {/* Balance indicator */}
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${balanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {balanced
                ? <><span className="text-lg">✓</span> Balanced — ready to post</>
                : <><AlertCircle size={15} /> Not balanced yet · DR {totalDr.toFixed(2)} / CR {totalCr.toFixed(2)}</>
              }
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={14} /> {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
            <Button type="button" variant="secondary" onClick={close} className="min-h-[44px] rounded-2xl">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !balanced}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? "Posting…" : "Post Entry"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
