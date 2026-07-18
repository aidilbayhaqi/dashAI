"use client";

import Link from "next/link";
import { CheckCircle2, FileBarChart, Loader2, ShieldCheck } from "lucide-react";

import type {
  AIFinancialReportDraft,
  AIReportDraftResponse,
  AIReportExecutionResponse,
} from "../types";

export function ReportDraftPreview({
  preview,
  result,
  confirming,
  onChange,
  onConfirm,
}: {
  preview: AIReportDraftResponse;
  result?: AIReportExecutionResponse;
  confirming: boolean;
  onChange: <K extends keyof AIFinancialReportDraft>(key: K, value: AIFinancialReportDraft[K]) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-wide text-violet-600">Report draft · {preview.provider}</p><h3 className="mt-1 font-black">Review parameter laporan</h3></div>
        <FileBarChart className="text-violet-500" />
      </div>
      {preview.warnings.map((warning) => <p key={warning} className="rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">{warning}</p>)}
      <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-black dark:border-slate-800 dark:bg-slate-900">{preview.draft.title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-500">Jenis laporan<select value={preview.draft.report_type} onChange={(event) => onChange("report_type", event.target.value as AIFinancialReportDraft["report_type"])} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"><option value="profit_loss">Laba rugi</option><option value="cashflow">Arus kas</option><option value="balance_sheet">Neraca</option></select></label>
        <label className="text-xs font-bold text-slate-500">Tanggal laporan<input type="date" value={preview.draft.report_date} onChange={(event) => onChange("report_date", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900" /></label>
        <label className="text-xs font-bold text-slate-500">Mulai periode<input type="date" disabled={preview.draft.report_type === "balance_sheet"} value={preview.draft.start_date} onChange={(event) => onChange("start_date", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900" /></label>
        <label className="text-xs font-bold text-slate-500">Akhir periode<input type="date" disabled={preview.draft.report_type === "balance_sheet"} value={preview.draft.end_date} onChange={(event) => onChange("end_date", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900" /></label>
      </div>
      {result ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300">
          <div className="flex items-center gap-2"><CheckCircle2 size={17} /> {result.message}</div>
          <Link href="/finance" className="mt-2 inline-flex underline">Buka modul finance</Link>
        </div>
      ) : (
        <button type="button" disabled={confirming} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
          {confirming ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Konfirmasi dan generate laporan
        </button>
      )}
    </div>
  );
}
