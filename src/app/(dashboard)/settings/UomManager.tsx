"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, Ruler } from "lucide-react";

type Uom = { id: string; code: string; label: string };

export function UomManager({ initial }: { initial: Uom[] }) {
  const [uoms, setUoms] = useState<Uom[]>(initial);
  const [addCode, setAddCode] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputCls = "h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20";

  const handleAdd = async () => {
    if (!addCode.trim()) { setAddError("Code is required"); return; }
    setAdding(true); setAddError("");
    const res = await fetch("/api/uom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: addCode, label: addLabel || addCode }),
    });
    if (res.ok) {
      const uom = await res.json();
      setUoms((p) => [...p, uom].sort((a, b) => a.code.localeCompare(b.code)));
      setAddCode(""); setAddLabel("");
    } else {
      const j = await res.json().catch(() => ({}));
      setAddError(j.error ?? "Already exists");
    }
    setAdding(false);
  };

  const startEdit = (u: Uom) => { setEditId(u.id); setEditCode(u.code); setEditLabel(u.label); };
  const cancelEdit = () => setEditId(null);

  const handleSave = async (id: string) => {
    setSaving(true);
    const res = await fetch("/api/uom", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, code: editCode, label: editLabel }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUoms((p) => p.map((u) => (u.id === id ? updated : u)).sort((a, b) => a.code.localeCompare(b.code)));
      setEditId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch("/api/uom", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setUoms((p) => p.filter((u) => u.id !== id));
    setDeletingId(null);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-slate-500"><Ruler size={18} /></span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Units of Measurement</h2>
            <p className="mt-1 text-sm text-slate-500">Manage UOM codes used on inventory items, purchase orders, and invoices.</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6 space-y-4">
        {/* Add row */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Code *</label>
            <input
              className={`${inputCls} w-24 uppercase`}
              placeholder="KG"
              value={addCode}
              onChange={(e) => { setAddCode(e.target.value.toUpperCase()); setAddError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Label</label>
            <input
              className={`${inputCls} w-40`}
              placeholder="Kilogram"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
          {addError && <p className="text-xs text-rose-600">{addError}</p>}
        </div>

        {/* Table */}
        {uoms.length === 0 ? (
          <p className="text-sm text-slate-400">No UOMs yet. Add one above.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Label</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uoms.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 transition hover:bg-slate-50/60">
                    {editId === u.id ? (
                      <>
                        <td className="px-4 py-2.5">
                          <input className={`${inputCls} w-24 uppercase`} value={editCode}
                            onChange={(e) => setEditCode(e.target.value.toUpperCase())} />
                        </td>
                        <td className="px-4 py-2.5">
                          <input className={`${inputCls} w-40`} value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleSave(u.id)} disabled={saving}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
                              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button onClick={cancelEdit}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200">
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-mono text-xs font-semibold text-violet-700">{u.code}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{u.label}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => startEdit(u)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-700">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                              {deletingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
