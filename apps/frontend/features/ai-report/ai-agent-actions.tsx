"use client";

import { useState } from "react";
import {
  AlertTriangle,
  FileBarChart,
  FileText,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCompanyScope } from "@/hooks/use-company-scope";
import { getApiErrorMessage } from "@/lib/api-error";

import { InvoiceDraftPreview } from "./components/invoice-draft-preview";
import { ReportDraftPreview } from "./components/report-draft-preview";
import { useAIActions } from "./use-ai-actions";
import { buildFinancialReportTitle } from "./utils";
import type {
  AIFinancialReportDraft,
  AIInvoiceDraft,
  AIInvoiceDraftResponse,
  AIReportDraftResponse,
} from "./types";


type ActionTab = "invoice" | "report";

const invoiceExample =
  "Buat invoice untuk PT Maju Bersama senilai 5 juta, PPN 11%, jatuh tempo 14 hari";
const reportExample = "Buat laporan laba rugi untuk periode bulan ini";

export function AIAgentActions() {
  const companyId = useCompanyScope();
  const branchId = useBranchScope();
  const actions = useAIActions();

  const [tab, setTab] = useState<ActionTab>("invoice");
  const [instruction, setInstruction] = useState(invoiceExample);
  const [invoicePreview, setInvoicePreview] = useState<AIInvoiceDraftResponse | null>(null);
  const [reportPreview, setReportPreview] = useState<AIReportDraftResponse | null>(null);

  const companyMissing = !companyId || companyId === "all";
  const busy =
    actions.invoiceDraft.isPending ||
    actions.invoiceConfirm.isPending ||
    actions.reportDraft.isPending ||
    actions.reportConfirm.isPending;

  function resetActionState() {
    actions.invoiceDraft.reset();
    actions.invoiceConfirm.reset();
    actions.reportDraft.reset();
    actions.reportConfirm.reset();
  }

  function changeTab(nextTab: ActionTab) {
    resetActionState();
    setInvoicePreview(null);
    setReportPreview(null);
    setTab(nextTab);
    setInstruction(nextTab === "invoice" ? invoiceExample : reportExample);
  }

  async function buildDraft() {
    if (companyMissing) return;
    resetActionState();

    try {
      if (tab === "invoice") {
        const response = await actions.invoiceDraft.mutateAsync({
          companyId,
          branchId,
          instruction,
        });
        setInvoicePreview(response);
        setReportPreview(null);
        return;
      }

      const response = await actions.reportDraft.mutateAsync({
        companyId,
        branchId,
        instruction,
      });
      setReportPreview(response);
      setInvoicePreview(null);
    } catch {
      // Mutation error is displayed below the instruction field.
    }
  }

  function updateInvoice<K extends keyof AIInvoiceDraft>(
    key: K,
    value: AIInvoiceDraft[K],
  ) {
    actions.invoiceConfirm.reset();
    setInvoicePreview((current) => current ? {
      ...current,
      draft: { ...current.draft, [key]: value },
    } : current);
  }

  function updateReport<K extends keyof AIFinancialReportDraft>(
    key: K,
    value: AIFinancialReportDraft[K],
  ) {
    actions.reportConfirm.reset();
    setReportPreview((current) => {
      if (!current) return current;
      const nextDraft = { ...current.draft, [key]: value } as AIFinancialReportDraft;
      nextDraft.title = buildFinancialReportTitle(nextDraft);
      return { ...current, draft: nextDraft };
    });
  }

  function confirmInvoice() {
    if (!invoicePreview) return;
    actions.invoiceConfirm.mutate({
      draftId: invoicePreview.draft_id,
      actionToken: invoicePreview.action_token,
      draft: invoicePreview.draft,
    });
  }

  function confirmReport() {
    if (!reportPreview) return;
    actions.reportConfirm.mutate({
      draftId: reportPreview.draft_id,
      actionToken: reportPreview.action_token,
      draft: reportPreview.draft,
    });
  }

  const error =
    actions.invoiceDraft.error ||
    actions.invoiceConfirm.error ||
    actions.reportDraft.error ||
    actions.reportConfirm.error;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-900 dark:bg-[#050816]">
      <header className="border-b border-slate-200 p-5 sm:p-6 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Sparkles size={21} /></div>
            <div>
              <h2 className="text-lg font-black">AI Assisted Actions</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">AI menyusun draft. Backend menghitung ulang, memeriksa permission, tenant, idempotency, dan token sekali pakai sebelum data dibuat.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck size={14} /> Human confirmation</span>
        </div>
        <div className="mt-5 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
          <button type="button" onClick={() => changeTab("invoice")} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${tab === "invoice" ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300" : "text-slate-500"}`}><ReceiptText size={16} /> Invoice</button>
          <button type="button" onClick={() => changeTab("report")} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${tab === "report" ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300" : "text-slate-500"}`}><FileBarChart size={16} /> Laporan</button>
        </div>
      </header>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <label className="text-sm font-black text-slate-800 dark:text-slate-100">Instruksi bisnis</label>
          <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={7} disabled={busy} className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-slate-800 dark:bg-[#02040a] dark:focus:ring-violet-950" />
          {companyMissing ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700 dark:border-amber-950 dark:bg-amber-950/20 dark:text-amber-300">Pilih company terlebih dahulu.</p> : null}
          {error ? <p className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{getApiErrorMessage(error)}</p> : null}
          <button type="button" onClick={() => void buildDraft()} disabled={companyMissing || busy || instruction.trim().length < 5} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-50">
            {actions.invoiceDraft.isPending || actions.reportDraft.isPending ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />} Buat draft dengan AI
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-[#02040a]">
          {!invoicePreview && !reportPreview ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center"><FileText size={32} className="text-slate-300" /><p className="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">Draft akan tampil di sini</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">Tidak ada perubahan data sampai tombol konfirmasi ditekan.</p></div>
          ) : null}
          {invoicePreview ? <InvoiceDraftPreview preview={invoicePreview} createdInvoice={actions.invoiceConfirm.data} confirming={actions.invoiceConfirm.isPending} onChange={updateInvoice} onConfirm={confirmInvoice} /> : null}
          {reportPreview ? <ReportDraftPreview preview={reportPreview} result={actions.reportConfirm.data} confirming={actions.reportConfirm.isPending} onChange={updateReport} onConfirm={confirmReport} /> : null}
        </div>
      </div>
    </section>
  );
}
