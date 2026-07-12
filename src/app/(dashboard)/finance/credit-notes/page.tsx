import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, FileMinus } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export default async function CreditNotesPage() {
  const creditNotes = await prisma.creditNote.findMany({
    where: { type: "CUSTOMER" },
    include: { customer: true, invoice: true },
    orderBy: { date: "desc" },
  });

  const total = creditNotes.reduce((s, cn) => s + Number(cn.amount) + Number(cn.vatAmount), 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Link href="/finance/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Credit Notes</h1>
              <p className="mt-0.5 text-sm text-slate-500">{creditNotes.length} credit notes · Total {formatAED(total)}</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <FileMinus size={16} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">All Customer Credit Notes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["CN Number", "Date", "Customer", "Against Invoice", "Amount", "VAT", "Total", "Reason"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creditNotes.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">No credit notes issued yet</td></tr>
                )}
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-rose-600">{cn.number}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{new Date(cn.date).toLocaleDateString("en-AE")}</td>
                    <td className="px-5 py-4">
                      {cn.customer ? (
                        <Link href={`/finance/customers/${cn.customer.id}`} className="text-sm font-medium text-slate-800 hover:text-sky-700 hover:underline">
                          {cn.customer.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-sky-700">{cn.invoice?.number ?? "—"}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-slate-700">{formatAED(Number(cn.amount))}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-slate-500">{formatAED(Number(cn.vatAmount))}</td>
                    <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-900">{formatAED(Number(cn.amount) + Number(cn.vatAmount))}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 max-w-[180px] truncate">{cn.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </main>
  );
}
