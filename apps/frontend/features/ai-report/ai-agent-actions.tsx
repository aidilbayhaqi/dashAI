"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
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

import { useAIActions } from "./use-ai-actions";
import type {
  AIFinancialReportDraft,
  AIInvoiceDraft,
  AIInvoiceDraftResponse,
  AIReportDraftResponse,
} from "./types";


type ActionTab = "invoice" | "report";

const invoiceExample =
  "Buat invoice untuk PT Maju Bersama senilai 5 juta, PPN 11%, jatuh tempo 14 hari";
const reportExample =
  "Buat laporan laba rugi untuk periode bulan ini";

function formatRupiah(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function AIAgentActions() {
  const companyId = useCompanyScope();
  const branchId = useBranchScope();
  const actions = useAIActions();

  const [tab, setTab] = useState<ActionTab>("invoice");
  const [instruction, setInstruction] = useState(invoiceExample);
  const [invoicePreview, setInvoicePreview] =
    useState<AIInvoiceDraftResponse | null>(null);
  const [reportPreview, setReportPreview] =
    useState<AIReportDraftResponse | null>(null);

  const companyMissing = !companyId || companyId === "all";
  const busy =
    actions.invoiceDraft.isPending ||
    actions.invoiceConfirm.isPending ||
    actions.reportDraft.isPending ||
    actions.reportConfirm.isPending;

  function changeTab(nextTab: ActionTab) {
    setTab(nextTab);
    setInstruction(nextTab === "invoice" ? invoiceExample : reportExample);
  }

  async function buildDraft() {
    if (companyMissing) return;

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
  }

  function updateInvoice<K extends keyof AIInvoiceDraft>(
    key: K,
    value: AIInvoiceDraft[K],
  ) {
    setInvoicePreview((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              [key]: value,
            },
          }
        : current,
    );
  }

  function updateReport<K extends keyof AIFinancialReportDraft>(
    key: K,
    value: AIFinancialReportDraft[K],
  ) {
    setReportPreview((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              [key]: value,
            },
          }
        : current,
    );
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              <Sparkles size={21} />
            </div>
            <div>
              <h2 className="text-lg font-black">AI Assisted Actions</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                AI menyusun draft. Backend tetap menghitung ulang, memeriksa
                permission, tenant, dan idempotency sebelum data dibuat.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck size={14} /> Human confirmation
          </span>
        </div>

        <div className="mt-5 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => changeTab("invoice")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
              tab === "invoice"
                ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300"
                : "text-slate-500"
            }`}
          >
            <ReceiptText size={16} /> Invoice
          </button>
          <button
            type="button"
            onClick={() => changeTab("report")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
              tab === "report"
                ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300"
                : "text-slate-500"
            }`}
          >
            <FileBarChart size={16} /> Laporan
          </button>
        </div>
      </header>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <label className="text-sm font-black text-slate-800 dark:text-slate-100">
            Instruksi bisnis
          </label>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={7}
            disabled={busy}
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-slate-800 dark:bg-[#02040a] dark:focus:ring-violet-950"
          />

          {companyMissing ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700 dark:border-amber-950 dark:bg-amber-950/20 dark:text-amber-300">
              Pilih company terlebih dahulu.
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {getApiErrorMessage(error)}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void buildDraft()}
            disabled={companyMissing || busy || instruction.trim().length < 5}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actions.invoiceDraft.isPending || actions.reportDraft.isPending ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            Buat draft dengan AI
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-[#02040a]">
          {!invoicePreview && !reportPreview ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <FileText size={32} className="text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">
                Draft akan tampil di sini
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                Tidak ada perubahan data sampai tombol konfirmasi ditekan.
              </p>
            </div>
          ) : null}

          {invoicePreview ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-violet-600">
                    Invoice draft · {invoicePreview.provider}
                  </p>
                  <h3 className="mt-1 font-black">Review sebelum dibuat</h3>
                </div>
                <ReceiptText className="text-violet-500" />
              </div>

              {invoicePreview.warnings.map((warning) => (
                <p key={warning} className="rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                  {warning}
                </p>
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-500">
                  Nomor invoice
                  <input
                    value={invoicePreview.draft.invoice_no}
                    onChange={(event) => updateInvoice("invoice_no", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Client
                  <input
                    value={invoicePreview.draft.client_name}
                    onChange={(event) => updateInvoice("client_name", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Tanggal invoice
                  <input
                    type="date"
                    value={invoicePreview.draft.invoice_date}
                    onChange={(event) => updateInvoice("invoice_date", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Jatuh tempo
                  <input
                    type="date"
                    value={invoicePreview.draft.due_date ?? ""}
                    onChange={(event) => updateInvoice("due_date", event.target.value || null)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  />
                </label>
              </div>

              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex justify-between"><span>Subtotal</span><b>{formatRupiah(invoicePreview.draft.subtotal_amount)}</b></div>
                <div className="flex justify-between"><span>Pajak ({invoicePreview.draft.tax_rate_percent}%)</span><b>{formatRupiah(invoicePreview.draft.tax_amount)}</b></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base dark:border-slate-700"><span>Total</span><b>{formatRupiah(invoicePreview.draft.total_amount)}</b></div>
              </div>

              {actions.invoiceConfirm.data ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <div className="flex items-center gap-2"><CheckCircle2 size={17} /> Invoice berhasil dibuat.</div>
                  <Link href="/finance/invoices" className="mt-2 inline-flex underline">Buka daftar invoice</Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={actions.invoiceConfirm.isPending}
                  onClick={() =>
                    void actions.invoiceConfirm.mutateAsync({
                      actionToken: invoicePreview.action_token,
                      draft: invoicePreview.draft,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actions.invoiceConfirm.isPending ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                  Konfirmasi dan buat invoice
                </button>
              )}
            </div>
          ) : null}

          {reportPreview ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-violet-600">
                    Report draft · {reportPreview.provider}
                  </p>
                  <h3 className="mt-1 font-black">Review parameter laporan</h3>
                </div>
                <FileBarChart className="text-violet-500" />
              </div>

              {reportPreview.warnings.map((warning) => (
                <p key={warning} className="rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                  {warning}
                </p>
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-500">
                  Jenis laporan
                  <select
                    value={reportPreview.draft.report_type}
                    onChange={(event) => updateReport("report_type", event.target.value as AIFinancialReportDraft["report_type"])}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  >
                    <option value="profit_loss">Laba rugi</option>
                    <option value="cashflow">Arus kas</option>
                    <option value="balance_sheet">Neraca</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Tanggal laporan
                  <input
                    type="date"
                    value={reportPreview.draft.report_date}
                    onChange={(event) => updateReport("report_date", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Mulai periode
                  <input
                    type="date"
                    value={reportPreview.draft.start_date}
                    onChange={(event) => updateReport("start_date", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Akhir periode
                  <input
                    type="date"
                    value={reportPreview.draft.end_date}
                    onChange={(event) => updateReport("end_date", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900"
                  />
                </label>
              </div>

              {actions.reportConfirm.data ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <div className="flex items-center gap-2"><CheckCircle2 size={17} /> {actions.reportConfirm.data.message}</div>
                  <Link href="/finance" className="mt-2 inline-flex underline">Buka modul finance</Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={actions.reportConfirm.isPending}
                  onClick={() =>
                    void actions.reportConfirm.mutateAsync({
                      actionToken: reportPreview.action_token,
                      draft: reportPreview.draft,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actions.reportConfirm.isPending ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                  Konfirmasi dan generate laporan
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
