"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Plus, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { formatAED } from "@/lib/utils";

type AgentForm = { name: string; email: string; isInternal: string; trn: string; rate: string; basis: string };
type CommForm  = { agentId: string; invoiceId: string };

interface Props {
  agents: any[];
  // when used as inline row action:
  markPaidId?:     string;
  markPaidAmount?: number;
}

export function CommissionActions({ agents, markPaidId, markPaidAmount }: Props) {
  const [agentOpen, setAgentOpen] = useState(false);
  const [commOpen,  setCommOpen]  = useState(false);
  const [paying,    setPaying]    = useState(false);
  const [invoices,  setInvoices]  = useState<any[]>([]);
  const router = useRouter();

  const agentForm = useForm<AgentForm>({
    defaultValues: { isInternal: "true", basis: "GROSS_SALE", rate: "5" },
  });
  const commForm = useForm<CommForm>();

  useEffect(() => {
    if (commOpen) fetch("/api/sales?status=ISSUED").then((r) => r.json()).then(setInvoices);
  }, [commOpen]);

  const onAgentSubmit = async (data: AgentForm) => {
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, isInternal: data.isInternal === "true", rate: Number(data.rate) }),
    });
    agentForm.reset();
    setAgentOpen(false);
    router.refresh();
  };

  const onCommSubmit = async (data: CommForm) => {
    await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    commForm.reset();
    setCommOpen(false);
    router.refresh();
  };

  const markPaid = async () => {
    if (!markPaidId) return;
    setPaying(true);
    await fetch(`/api/commissions/${markPaidId}`, { method: "PUT" });
    setPaying(false);
    router.refresh();
  };

  // ── Inline row "Mark Paid" button ─────────────────────────────────────────
  if (markPaidId) {
    return (
      <button
        onClick={markPaid}
        disabled={paying}
        title={`Pay out ${markPaidAmount !== undefined ? formatAED(markPaidAmount) : ""}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-px hover:shadow-sm disabled:opacity-50 disabled:pointer-events-none"
      >
        {paying
          ? <Loader2 size={12} className="animate-spin" />
          : <CheckCircle2 size={12} />
        }
        {paying ? "Processing…" : "Mark Paid"}
      </button>
    );
  }

  // ── Top-level toolbar buttons ──────────────────────────────────────────────
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setAgentOpen(true)}>
        <Plus size={16} /> Add Agent
      </Button>
      <Button onClick={() => setCommOpen(true)}>
        <Plus size={16} /> Assign Commission
      </Button>

      {/* Add Agent modal */}
      <Modal open={agentOpen} onClose={() => setAgentOpen(false)} title="Add Agent / Broker">
        <form onSubmit={agentForm.handleSubmit(onAgentSubmit)} className="space-y-4">
          <Input label="Name *"              {...agentForm.register("name",  { required: true })} />
          <Input label="Email"               {...agentForm.register("email")} />
          <Input label="TRN (if external)"   {...agentForm.register("trn")} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={[
              { value: "true",  label: "Internal Staff" },
              { value: "false", label: "External Broker" },
            ]} {...agentForm.register("isInternal")} />
            <Select label="Commission Basis" options={[
              { value: "GROSS_SALE",    label: "Gross Sale" },
              { value: "NET_ITEMS",     label: "Net Items" },
              { value: "AFTER_PAYMENT", label: "After Full Payment" },
            ]} {...agentForm.register("basis")} />
          </div>
          <Input label="Rate (%)" type="number" step="0.01" {...agentForm.register("rate")} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAgentOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={agentForm.formState.isSubmitting}>Save Agent</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Commission modal */}
      <Modal open={commOpen} onClose={() => setCommOpen(false)} title="Assign Commission">
        <form onSubmit={commForm.handleSubmit(onCommSubmit)} className="space-y-4">
          <Select
            label="Agent *"
            options={[
              { value: "", label: "Select agent…" },
              ...agents.map((a) => ({ value: a.id, label: `${a.name} (${a.rate}%)` })),
            ]}
            {...commForm.register("agentId", { required: true })}
          />
          <Select
            label="Invoice *"
            options={[
              { value: "", label: "Select invoice…" },
              ...invoices.map((i) => ({ value: i.id, label: `${i.number} — ${i.customer?.name}` })),
            ]}
            {...commForm.register("invoiceId", { required: true })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCommOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={commForm.formState.isSubmitting}>Assign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
