import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/utils";
import { ExpenseActions, ExpenseEditButton } from "./ExpenseActions";
import { Receipt, ArrowLeft } from "lucide-react";
import Link from "next/link";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Rent", UTILITIES: "Utilities", SALARIES: "Salaries",
  TRANSPORT: "Transport", MARKETING: "Marketing",
  OFFICE_SUPPLIES: "Office Supplies", BANK_CHARGES: "Bank Charges",
  INSURANCE: "Insurance", MAINTENANCE: "Maintenance", OTHER: "Other",
};

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-4 lg:py-6">

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/accounting" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2">
                <ArrowLeft size={13} /> Accounting
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Accounting</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Expenses</h1>
              <p className="mt-1 text-sm text-slate-500">{expenses.length} records · Total {formatAED(total)}</p>
            </div>
            <ExpenseActions />
          </div>
        </Card>

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <Card key={cat} className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{CATEGORY_LABELS[cat] ?? cat}</p>
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-slate-900">{formatAED(amt)}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <Receipt size={17} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">All Expenses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Date", "Description", "Category", "Reference", "Amount", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString("en-AE")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{e.description}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{e.reference ?? "—"}</td>
                    <td className="px-6 py-4 text-sm font-semibold tabular-nums text-slate-900">{formatAED(Number(e.amount))}</td>
                    <td className="px-6 py-4 text-right">
                      <ExpenseEditButton
                        expenseId={e.id}
                        description={e.description}
                        category={e.category}
                        amount={Number(e.amount)}
                        date={e.date}
                        reference={e.reference}
                      />
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">No expenses recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </main>
  );
}
