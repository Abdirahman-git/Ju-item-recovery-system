'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react';
import {
  exportOfficialExecutivePdf,
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
  exportSummaryCsv,
  exportSummaryExcel,
  printReport,
  printSummaryReport,
} from '@/lib/reportExport';
import { useSession } from '@/context/SessionProvider';

const FORMATS = [
  { id: 'print', label: 'Print', icon: Printer, hint: 'Opens print dialog with photos' },
  { id: 'pdf', label: 'Save as PDF', icon: FileText, hint: 'Print dialog → Microsoft Print to PDF' },
  { id: 'excel', label: 'Excel (.xls)', icon: FileSpreadsheet, hint: 'Instant download' },
  { id: 'csv', label: 'CSV', icon: Download, hint: 'Instant download' },
];

export default function ReportExportMenu({
  disabled = false,
  filename,
  title,
  subtitle,
  generatedAt,
  metaLines = [],
  columns,
  rows,
  formatStatusLabel,
  buttonLabel = 'Export',
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function runExport(formatId) {
    setOpen(false);
    if (disabled || !rows?.length) return;

    const formatters = { formatStatusLabel };
    const payload = {
      title: title || 'JU LOFO Report',
      subtitle,
      generatedAt,
      metaLines,
      columns,
      rows,
      formatters,
    };

    try {
      if (formatId === 'print' || formatId === 'pdf') {
        setPreparing(true);
      }
      if (formatId === 'print') {
        await printReport(payload);
        return;
      }
      if (formatId === 'pdf') {
        await exportReportPdf(payload);
        return;
      }
      if (formatId === 'excel') {
        exportReportExcel(filename, columns, rows, formatters);
        return;
      }
      exportReportCsv(filename, columns, rows, formatters);
    } catch (error) {
      window.alert(error?.message || 'Could not export this report.');
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || preparing}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-2 rounded-lg bg-[#1A56DB] text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-[#1648c7] disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? 'px-3 py-2' : 'px-4 py-2.5'
        }`}
      >
        {preparing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {preparing ? 'Preparing…' : buttonLabel}
        {!preparing ? <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} /> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[70] mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
          {FORMATS.map((format) => {
            const Icon = format.icon;
            return (
              <button
                key={format.id}
                type="button"
                disabled={disabled || preparing}
                onClick={() => runExport(format.id)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1A56DB]/10 text-[#1A56DB]">
                  <Icon size={15} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">{format.label}</span>
                  <span className="block text-[11px] font-medium text-slate-500">{format.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SummaryExportMenu({ view, formatGeneratedAt, compact = true }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function run(formatId) {
    setOpen(false);
    try {
      if (formatId === 'official_pdf') {
        exportOfficialExecutivePdf(view, formatGeneratedAt, session);
      } else if (formatId === 'print' || formatId === 'pdf') {
        printSummaryReport(view, formatGeneratedAt);
      } else if (formatId === 'excel') {
        exportSummaryExcel(view, formatGeneratedAt);
      } else {
        exportSummaryCsv(view, formatGeneratedAt);
      }
    } catch (error) {
      window.alert(error?.message || 'Could not export summary.');
    }
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        <Download size={13} />
        <span className={compact ? 'hidden sm:inline' : ''}>Summary</span>
        <ChevronDown size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[70] mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
          <button
            type="button"
            onClick={() => run('official_pdf')}
            className="flex w-full items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-blue-50 px-3 py-2.5 text-left text-xs font-black text-emerald-800 transition hover:brightness-95"
          >
            <FileText size={15} className="shrink-0 text-emerald-600" />
            <span>📄 Official Executive PDF</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          {FORMATS.map((format) => {
            const Icon = format.icon;
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => run(format.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Icon size={14} className="text-[#1A56DB]" />
                {format.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
