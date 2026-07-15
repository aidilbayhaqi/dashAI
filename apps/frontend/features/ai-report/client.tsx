"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-error";

import { useAIReportModule } from "./hook";
import type { AIInsightSeverity, AIPriority } from "./types";

const severityClass: Record<AIInsightSeverity, string> = {
  critical: "border-rose-200 bg-rose-50 dark:border-rose-950 dark:bg-rose-950/20",
  warning: "border-amber-200 bg-amber-50 dark:border-amber-950 dark:bg-amber-950/20",
  info: "border-blue-200 bg-blue-50 dark:border-blue-950 dark:bg-blue-950/20",
};

const priorityClass: Record<AIPriority, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export function AIReportModuleClient() {
  const { summary, ask } = useAIReportModule();
  const [question, setQuestion] = useState("");

  function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = question.trim();
    if (normalized.length < 3 || ask.isPending) return;
    ask.mutate(normalized);
  }

  if (summary.isLoading) {
    return <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-900" />;
  }

  if (summary.error || !summary.data) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-950 dark:bg-rose-950/20">
        <h1 className="text-xl font-black text-rose-900 dark:text-rose-200">AI analytics gagal dimuat</h1>
        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{getApiErrorMessage(summary.error)}</p>
        <button type="button" onClick={() => void summary.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white">
          <RefreshCw size={15} /> Coba lagi
        </button>
      </div>
    );
  }

  const data = summary.data;

  return (
    <div className="min-w-0 space-y-6">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-8 dark:border-slate-800">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black">
              <LockKeyhole size={14} /> Read-only analytics
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{data.headline}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{data.executive_summary}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 text-center backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Health score</p>
            <p className="mt-2 text-5xl font-black">{data.health_score}</p>
            <p className="mt-1 text-xs text-slate-300">Provider: {data.provider}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
          <div className="flex items-center gap-3">
            <BrainCircuit className="text-blue-700 dark:text-blue-300" />
            <div><h2 className="text-lg font-black">Findings</h2><p className="text-sm text-slate-500">Dihasilkan dari agregat dashboard tanpa mengubah data.</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {data.findings.map((finding) => (
              <article key={finding.id} className={`rounded-2xl border p-4 ${severityClass[finding.severity]}`}>
                <div className="flex items-start gap-3">
                  {finding.severity === "critical" ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-950 dark:text-white">{finding.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{finding.description}</p>
                    {finding.metric_value ? <p className="mt-2 text-xs font-black text-slate-700 dark:text-slate-200">{finding.metric_label}: {finding.metric_value}</p> : null}
                  </div>
                  {finding.href ? <Link href={finding.href} aria-label={`Buka ${finding.title}`}><ArrowRight size={17} /></Link> : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
          <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-600" /><div><h2 className="text-lg font-black">Recommendations</h2><p className="text-sm text-slate-500">Saran tindakan tetap membutuhkan keputusan pengguna.</p></div></div>
          <div className="mt-5 space-y-3">
            {data.recommendations.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${priorityClass[item.priority]}`}>{item.priority}</span><p className="mt-3 text-sm font-black">{item.title}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.rationale}</p></div>
                  {item.href ? <Link href={item.href}><ArrowRight size={17} /></Link> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
          <div className="flex items-center gap-3"><Bot className="text-blue-700 dark:text-blue-300" /><div><h2 className="text-lg font-black">Ask DashAI</h2><p className="text-sm text-slate-500">Tanyakan revenue, invoice, stock, CRM, atau automation.</p></div></div>
          <form onSubmit={handleAsk} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={600} placeholder="Contoh: bagaimana kondisi invoice overdue?" className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-[#02040a]" />
            <button type="submit" disabled={ask.isPending || question.trim().length < 3} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
              {ask.isPending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />} Ask
            </button>
          </form>
          {ask.error ? <p className="mt-3 text-sm font-semibold text-rose-600">{getApiErrorMessage(ask.error)}</p> : null}
          {ask.data ? <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-950 dark:bg-blue-950/20"><p className="text-sm font-black text-slate-950 dark:text-white">{ask.data.answer}</p><ul className="mt-3 space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{ask.data.evidence.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
          <h2 className="text-lg font-black">Guardrails</h2>
          <div className="mt-4 space-y-3">{data.guardrails.map((item) => <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-[#02040a]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" /><p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{item}</p></div>)}</div>
        </div>
      </section>
    </div>
  );
}
