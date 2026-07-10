"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

export function MarkPaidButton({
  invoiceId,
  purchaseOrderId,
  label = "Mark Paid",
}: {
  invoiceId?: string;
  purchaseOrderId?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handle = async () => {
    setLoading(true);
    await fetch("/api/credit-notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, purchaseOrderId }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
      {label}
    </button>
  );
}
