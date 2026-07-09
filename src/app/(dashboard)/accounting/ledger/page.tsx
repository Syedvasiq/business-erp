import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LedgerActions } from "./LedgerActions";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export default async function LedgerPage() {
  const [journals, accounts] = await Promise.all([
    prisma.journal.findMany({
      orderBy: { date: "desc" },
      include: {
        lines: {
          include: { account: { select: { code: true, name: true } } },
          orderBy: { type: "asc" },
        },
      },
    }),
    prisma.account.findMany({ orderBy: { code: "asc" } }),
  ]);

  const totalDebits = journals
    .flatMap((j) => j.lines)
    .filter((l) => l.type === "DEBIT")
    .reduce((s, l) => s + Number(l.aedAmount), 0);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/accounting" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2">
                <ArrowLeft size={13} /> Accounting
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Accounting</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Ledger Book</h1>
              <p className="mt-1 text-sm text-slate-500">
                {journals.length} journal entries · Total debits {formatAED(totalDebits)}
              </p>
            </div>
            <LedgerActions accounts={accounts} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <BookOpen size={17} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">All Journal Entries</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {journals.length === 0 && (
              <p className="px-6 py-12 text-center text-sm text-slate-400">No journal entries yet</p>
            )}

            {journals.map((journal) => {
              const debits  = journal.lines.filter((l) => l.type === "DEBIT");
              const credits = journal.lines.filter((l) => l.type === "CREDIT");
              const totalDr = debits.reduce((s, l) => s + Number(l.aedAmount), 0);
              const totalCr = credits.reduce((s, l) => s + Number(l.aedAmount), 0);

              return (
                <div key={journal.id} className="px-6 py-5 hover:bg-slate-50/60 transition">
                  {/* Entry header */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono text-sm font-semibold text-sky-700">{journal.reference}</span>
                      <p className="mt-0.5 text-sm text-slate-700">{journal.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {new Date(journal.date).toLocaleDateString("en-AE", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </p>
                      {journal.locked && (
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DR / CR lines */}
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Account</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Code</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Debit (AED)</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Credit (AED)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journal.lines.map((line) => (
                          <tr key={line.id} className="border-t border-slate-100">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{line.account.name}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{line.account.code}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                              {line.type === "DEBIT" ? formatAED(Number(line.aedAmount)) : ""}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-sky-700">
                              {line.type === "CREDIT" ? formatAED(Number(line.aedAmount)) : ""}
                            </td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td colSpan={2} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">Total</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700">{formatAED(totalDr)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-bold text-sky-700">{formatAED(totalCr)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </main>
  );
}
