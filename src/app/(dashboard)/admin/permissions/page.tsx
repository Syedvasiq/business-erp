"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Loader2, Check } from "lucide-react";

const MODULES = [
  "customers",
  "suppliers",
  "inventory",
  "sales",
  "purchases",
  "commissions",
  "accounting",
  "users",
  "settings",
] as const;

const ROLES = ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"] as const;

type Action = "canView" | "canCreate" | "canEdit" | "canDelete";
const ACTIONS: { key: Action; label: string }[] = [
  { key: "canView",   label: "View"   },
  { key: "canCreate", label: "Create" },
  { key: "canEdit",   label: "Edit"   },
  { key: "canDelete", label: "Delete" },
];

type PermMap = Record<string, Record<string, Record<Action, boolean>>>;

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      "bg-blue-50 text-blue-700 ring-blue-100",
  ACCOUNTANT: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  SALES:      "bg-amber-50 text-amber-700 ring-amber-100",
  VIEWER:     "bg-slate-100 text-slate-600 ring-slate-200",
};

function empty(): Record<Action, boolean> {
  return { canView: false, canCreate: false, canEdit: false, canDelete: false };
}

export default function PermissionsPage() {
  const [perms, setPerms] = useState<PermMap>({});
  const [saving, setSaving] = useState<string | null>(null); // "ROLE:module"
  const [saved,  setSaved]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/permissions")
      .then((r) => r.json())
      .then((data) => { setPerms(data); setLoading(false); });
  }, []);

  const get = (role: string, mod: string): Record<Action, boolean> =>
    perms[role]?.[mod] ?? empty();

  const toggle = useCallback(
    async (role: string, mod: string, action: Action, value: boolean) => {
      const current = get(role, mod);
      const updated = { ...current, [action]: value };

      // If un-checking view, clear all others too
      if (action === "canView" && !value) {
        updated.canCreate = false;
        updated.canEdit   = false;
        updated.canDelete = false;
      }
      // If checking any action, auto-enable view
      if (action !== "canView" && value) {
        updated.canView = true;
      }

      setPerms((prev) => ({
        ...prev,
        [role]: { ...(prev[role] ?? {}), [mod]: updated },
      }));

      const key = `${role}:${mod}`;
      setSaving(key);
      await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, module: mod, ...updated }),
      });
      setSaving(null);
      setSaved(key);
      setTimeout(() => setSaved(null), 1500);
    },
    [perms]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">

        {/* Header */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Access control
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Roles &amp; Permissions
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure what each role can view, create, edit, or delete. SUPER ADMIN always has full access.
              </p>
            </div>
          </div>
        </div>

        {/* Matrix — one card per role */}
        {ROLES.map((role) => (
          <div
            key={role}
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
          >
            {/* Role header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${ROLE_COLORS[role]}`}>
                {role.replace("_", " ")}
              </span>
              <p className="text-sm text-slate-500">
                {role === "ADMIN"      && "All modules — customise per-module access below"}
                {role === "ACCOUNTANT" && "Finance-focused role"}
                {role === "SALES"      && "Customer-facing role"}
                {role === "VIEWER"     && "Read-only by default"}
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 sm:px-6">
                      Module
                    </th>
                    {ACTIONS.map((a) => (
                      <th
                        key={a.key}
                        className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                      >
                        {a.label}
                      </th>
                    ))}
                    <th className="w-16 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, idx) => {
                    const p   = get(role, mod);
                    const key = `${role}:${mod}`;
                    return (
                      <tr
                        key={mod}
                        className={`border-b border-slate-100 transition hover:bg-slate-50/60 ${idx % 2 === 0 ? "" : "bg-slate-50/30"}`}
                      >
                        <td className="px-5 py-3.5 sm:px-6">
                          <span className="text-sm font-medium capitalize text-slate-800">
                            {mod}
                          </span>
                        </td>

                        {ACTIONS.map((a) => (
                          <td key={a.key} className="px-3 py-3.5 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={p[a.key]}
                                onChange={(e) => toggle(role, mod, a.key, e.target.checked)}
                              />
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                                  p[a.key]
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-300 bg-white hover:border-slate-400"
                                }`}
                              >
                                {p[a.key] && <Check size={11} strokeWidth={3} />}
                              </span>
                            </label>
                          </td>
                        ))}

                        <td className="px-3 py-3.5 text-center">
                          {saving === key && (
                            <Loader2 size={14} className="mx-auto animate-spin text-slate-400" />
                          )}
                          {saved === key && saving !== key && (
                            <Check size={14} className="mx-auto text-emerald-500" strokeWidth={3} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* SUPER_ADMIN note */}
        <div className="rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4">
          <p className="text-sm text-violet-700">
            <span className="font-semibold">SUPER ADMIN</span> — always has full access to all modules and cannot be restricted.
          </p>
        </div>
      </div>
    </main>
  );
}
