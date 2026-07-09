"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Users, Loader2, AlertCircle } from "lucide-react";

type FormData = { itemId: string; userId: string; qty: string; note: string };

export function AllocateActions({
  items,
  users,
}: {
  items: { id: string; name: string; sku: string; stockQty: unknown }[];
  users: { id: string; name: string; role: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { itemId: "", userId: "", qty: "", note: "" },
  });

  const close = () => { reset(); setError(""); setOpen(false); };

  const onSubmit = async (data: FormData) => {
    setError("");
    const res = await fetch("/api/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, qty: Number(data.qty) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body.error ?? "Failed to allocate stock");
    }
    close();
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">
        <Plus size={16} /> Assign Stock
      </Button>

      <Modal open={open} onClose={close} title="">
        <div className="w-full max-w-md">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Assign Stock to Member</h2>
                <p className="text-sm text-slate-500">Deducts from available master inventory</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Item *</label>
              <select {...register("itemId", { required: "Required" })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">— Select item —</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.sku}) — {Number(i.stockQty).toFixed(2)} in stock
                  </option>
                ))}
              </select>
              {errors.itemId && <p className="mt-1 text-xs text-rose-600">{errors.itemId.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assign To *</label>
              <select {...register("userId", { required: "Required" })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">— Select member —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace("_", " ")})
                  </option>
                ))}
              </select>
              {errors.userId && <p className="mt-1 text-xs text-rose-600">{errors.userId.message}</p>}
            </div>

            <Input label="Quantity *" type="number" step="0.001" min="0.001" placeholder="0"
              {...register("qty", { required: "Required" })}
              error={errors.qty?.message} />

            <Input label="Note" placeholder="Optional note" {...register("note")} />

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" onClick={close} className="min-h-[44px] rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition">
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                {isSubmitting ? "Assigning…" : "Assign Stock"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
