"use client";

import { useState } from "react";
import { Download, FileText, Sheet, ChevronDown } from "lucide-react";
import { exportCSV, exportPDF } from "@/lib/export";

interface Props {
  filename: string;
  pdfTitle: string;
  pdfSubtitle?: string;
  csvRows?: Record<string, string | number>[];
  disabled?: boolean;
}

export function ExportButton({ filename, pdfTitle, pdfSubtitle = "", csvRows, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
      >
        <Download size={15} />
        Export
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {csvRows && (
              <button
                onClick={() => { exportCSV(filename, csvRows!); setOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                <Sheet size={15} className="text-emerald-600" />
                Export CSV
              </button>
            )}
            <button
              onClick={() => { exportPDF(pdfTitle, pdfSubtitle); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              <FileText size={15} className="text-rose-500" />
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
