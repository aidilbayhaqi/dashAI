"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, ReceiptText, ShieldCheck } from "lucide-react";

import type { AIInvoiceDraft, AIInvoiceDraftResponse, CreatedInvoice } from "../types";
import { formatRupiah } from "../utils";

export function InvoiceDraftPreview({
  preview,
  createdInvoice,
  confirming,
  onChange,
  onConfirm,
}: {
  preview: AIInvoiceDraftResponse;
  createdInvoice?: CreatedInvoice;
  confirming: boolean;
  onChange: <K extends keyof AIInvoiceDraft>(key: K, value: AIInvoiceDraft[K]) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-wide text-violet-600">Invoice draft · {preview.provider}</p><h3 className="mt-1 font-black">Review sebelum dibuat</h3></div>
        <ReceiptText className="text-violet-500" />
      </div>
      {preview.warnings.map((warning) => <p key={warning} className="rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">{warning}</p>)}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-500">Nomor invoice<input value={preview.draft.invoice_no} onChange={(event) => onChange("invoice_no", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900" /></label>
        <label className="text-xs font-bold text-slate-500">Client<input value={preview.draft.client_name} onChange={(event) => onChange("client_name", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900" /></label>
        <label className="text-xs font-bold text-slate-500">Tanggal invoice<input type="date" value={preview.draft.invoice_date} onChange={(event) => onChange("invoice_date", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900" /></label>
        <label className="text-xs font-bold text-slate-500">Jatuh tempo<input type="date" value={preview.draft.due_date ?? ""} onChange={(event) => onChange("due_date", event.target.value || null)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900" /></label>
      </div>
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex justify-between"><span>Subtotal</span><b>{formatRupiah(preview.draft.subtotal_amount)}</b></div>
        <div className="flex justify-between"><span>Pajak ({preview.draft.tax_rate_percent}%)</span><b>{formatRupiah(preview.draft.tax_amount)}</b></div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base dark:border-slate-700"><span>Total</span><b>{formatRupiah(preview.draft.total_amount)}</b></div>
      </div>
      {createdInvoice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300">
          <div className="flex items-center gap-2"><CheckCircle2 size={17} /> Invoice {createdInvoice.invoice_no} berhasil dibuat.</div>
          <Link href="/finance/invoices" className="mt-2 inline-flex underline">Buka daftar invoice</Link>
        </div>
      ) : (
        <button type="button" disabled={confirming} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
          {confirming ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Konfirmasi dan buat invoice
        </button>
      )}
    </div>
  );
}
