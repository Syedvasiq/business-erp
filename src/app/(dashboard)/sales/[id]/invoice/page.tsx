import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatAED } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "./PrintButton";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { include: { item: true } },
      },
    }),
    getSettings(),
  ]);

  if (!invoice) notFound();

  const subtotal = Number(invoice.subtotalAed);
  const vat = Number(invoice.vatAmount);
  const total = Number(invoice.totalAed);

  const issueDate = new Date(invoice.issueDate).toLocaleDateString("en-AE", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-AE", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : null;

  const invoiceLabel = invoice.isSimplified ? "Simplified Tax Invoice" : "Tax Invoice";

  const companyLine2 = [settings.emirate, "United Arab Emirates"].filter(Boolean).join(", ");
  const footerLine = [settings.companyName, companyLine2, settings.trn ? `TRN: ${settings.trn}` : ""]
    .filter(Boolean).join(" · ");

  return (
    <>
      <div className="no-print flex items-center justify-between bg-slate-100 px-6 py-3 border-b border-slate-200">
        <a href="/sales" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to Sales
        </a>
        <PrintButton />
      </div>

      <div className="invoice-page mx-auto max-w-[794px] bg-white px-12 py-10 print:px-10 print:py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
          <div>
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.companyName} className="mb-2 h-12 object-contain" />
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{settings.companyName}</h1>
            {settings.address && <p className="mt-0.5 text-sm text-slate-500">{settings.address}</p>}
            <p className="text-sm text-slate-500">{companyLine2}</p>
            {settings.phone && <p className="text-sm text-slate-500">{settings.phone}</p>}
            {settings.email && <p className="text-sm text-slate-500">{settings.email}</p>}
            {settings.trn && <p className="text-sm text-slate-500">TRN: {settings.trn}</p>}
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold uppercase tracking-widest text-slate-900">{invoiceLabel}</p>
            <p className="mt-2 font-mono text-lg font-semibold text-sky-700">{invoice.number}</p>
            {invoice.status === "CANCELLED" && (
              <span className="mt-2 inline-block rounded bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-700">
                Cancelled
              </span>
            )}
          </div>
        </div>

        {/* ── Bill To / Invoice Meta ── */}
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Bill To</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{invoice.customer.name}</p>
            {invoice.customer.address && <p className="mt-0.5 text-sm text-slate-600">{invoice.customer.address}</p>}
            {invoice.customer.emirate && <p className="text-sm text-slate-600">{invoice.customer.emirate}, UAE</p>}
            {invoice.customer.trn && (
              <p className="mt-1 text-sm text-slate-600">
                TRN: <span className="font-mono font-semibold">{invoice.customer.trn}</span>
              </p>
            )}
            {invoice.customer.email && <p className="text-sm text-slate-500">{invoice.customer.email}</p>}
            {invoice.customer.phone && <p className="text-sm text-slate-500">{invoice.customer.phone}</p>}
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Invoice Details</p>
            <table className="mt-2 ml-auto text-sm">
              <tbody>
                <tr>
                  <td className="pr-4 py-0.5 text-slate-500">Issue Date</td>
                  <td className="font-medium text-slate-900">{issueDate}</td>
                </tr>
                {dueDate && (
                  <tr>
                    <td className="pr-4 py-0.5 text-slate-500">Due Date</td>
                    <td className="font-medium text-slate-900">{dueDate}</td>
                  </tr>
                )}
                {invoice.emirate && (
                  <tr>
                    <td className="pr-4 py-0.5 text-slate-500">Emirate</td>
                    <td className="font-medium text-slate-900">{invoice.emirate}</td>
                  </tr>
                )}
                <tr>
                  <td className="pr-4 py-0.5 text-slate-500">Currency</td>
                  <td className="font-medium text-slate-900">{invoice.currency}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className="mt-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50">
                <th className="py-3 pl-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">#</th>
                <th className="py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Description</th>
                <th className="py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">SKU</th>
                <th className="py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Qty</th>
                <th className="py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Unit Price</th>
                <th className="py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">VAT</th>
                <th className="py-3 pr-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => {
                const taxLabel = line.taxType === "STANDARD" ? `${settings.vatRate}%`
                  : line.taxType === "ZERO_RATED" ? "0%" : "Exempt";
                return (
                  <tr key={line.id} className="border-b border-slate-100">
                    <td className="py-3 pl-3 text-slate-400">{i + 1}</td>
                    <td className="py-3 font-medium text-slate-900">{line.item.name}</td>
                    <td className="py-3 font-mono text-xs text-slate-500">{line.item.sku}</td>
                    <td className="py-3 text-right tabular-nums text-slate-700">{Number(line.qty).toFixed(2)}</td>
                    <td className="py-3 text-right tabular-nums text-slate-700">{formatAED(Number(line.unitPrice))}</td>
                    <td className="py-3 text-right tabular-nums text-slate-500">{taxLabel} / {formatAED(Number(line.vatAmount))}</td>
                    <td className="py-3 pr-3 text-right tabular-nums font-semibold text-slate-900">{formatAED(Number(line.lineTotal))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div className="mt-6 flex justify-end">
          <div className="w-72">
            <div className="flex justify-between border-t border-slate-200 py-2 text-sm">
              <span className="text-slate-500">Subtotal (excl. VAT)</span>
              <span className="tabular-nums font-medium text-slate-900">{formatAED(subtotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 py-2 text-sm">
              <span className="text-slate-500">VAT ({settings.vatRate}%)</span>
              <span className="tabular-nums font-medium text-slate-900">{formatAED(vat)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-900 py-3">
              <span className="text-base font-bold text-slate-900">Total (AED)</span>
              <span className="text-base tabular-nums font-bold text-slate-900">{formatAED(total)}</span>
            </div>
          </div>
        </div>

        {/* ── FTA Compliance Note ── */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="grid grid-cols-2 gap-6 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Payment Terms</p>
              <p className="mt-1">
                {dueDate ? `Due by ${dueDate}` : settings.paymentTermsDays > 0 ? `Net ${settings.paymentTermsDays} days` : "Due on receipt"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700">UAE FTA Compliance</p>
              <p className="mt-1">
                This is a {invoiceLabel} issued in accordance with UAE Federal Decree-Law No. 8 of 2017 on Value Added Tax.
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-8 border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
          {footerLine}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .invoice-page { max-width: 100%; box-shadow: none; }
        }
      `}</style>
    </>
  );
}
