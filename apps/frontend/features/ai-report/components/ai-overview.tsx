import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleGauge,
  Database,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import type {
  AIAnalyticsFinding,
  AIAnalyticsRecommendation,
  AIAnalyticsSummary,
  AIInsightSeverity,
  AIPriority,
} from "../types";

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

function SeverityIcon({ severity }: { severity: AIInsightSeverity }) {
  if (severity === "critical") return <AlertTriangle size={19} className="shrink-0 text-rose-600" />;
  if (severity === "warning") return <AlertTriangle size={19} className="shrink-0 text-amber-600" />;
  return <CheckCircle2 size={19} className="shrink-0 text-blue-600" />;
}

function Findings({ items }: { items: AIAnalyticsFinding[] }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><BrainCircuit size={21} /></div>
        <div><h2 className="text-lg font-black">Findings</h2><p className="text-sm text-slate-500">Agregat ERP tanpa write access.</p></div>
      </div>
      <div className="mt-5 space-y-3">
        {items.length ? items.map((finding) => (
          <article key={finding.id} className={`rounded-2xl border p-4 ${severityClass[finding.severity]}`}>
            <div className="flex items-start gap-3">
              <SeverityIcon severity={finding.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-950 dark:text-white">{finding.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{finding.description}</p>
                {finding.metric_value ? <p className="mt-2 text-xs font-black text-slate-700 dark:text-slate-200">{finding.metric_label}: {finding.metric_value}</p> : null}
              </div>
              {finding.href ? <Link href={finding.href} aria-label={`Buka ${finding.title}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-slate-600 hover:text-blue-700 dark:bg-slate-950/60 dark:text-slate-300"><ArrowRight size={17} /></Link> : null}
            </div>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
            <CheckCircle2 className="mx-auto text-emerald-600" />
            <p className="mt-3 text-sm font-black">Tidak ada temuan kritis</p>
            <p className="mt-1 text-xs text-slate-500">Sistem belum menemukan risiko utama pada periode ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Recommendations({ items }: { items: AIAnalyticsRecommendation[] }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"><WandSparkles size={21} /></div>
        <div><h2 className="text-lg font-black">Recommendations</h2><p className="text-sm text-slate-500">Saran tetap membutuhkan keputusan pengguna.</p></div>
      </div>
      <div className="mt-5 space-y-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${priorityClass[item.priority]}`}>{item.priority}</span>
                <p className="mt-3 text-sm font-black">{item.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.rationale}</p>
              </div>
              {item.href ? <Link href={item.href} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300"><ArrowRight size={16} /></Link> : null}
            </div>
          </article>
        )) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-800">Belum ada rekomendasi pada periode ini.</p>}
      </div>
    </div>
  );
}

export function AIOverview({ data }: { data: AIAnalyticsSummary }) {
  return (
    <>
      <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-8 dark:border-slate-800">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black"><LockKeyhole size={14} /> Read-only analytics</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-black text-indigo-100"><Sparkles size={14} /> Gemini ERP Agent</span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{data.headline}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{data.executive_summary}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
              <span className="inline-flex items-center gap-2"><Database size={14} /> ERP data</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={14} /> Tenant scoped</span>
              <span className="inline-flex items-center gap-2"><LockKeyhole size={14} /> No direct writes</span>
            </div>
          </div>
          <div className="min-w-44 rounded-[1.5rem] border border-white/15 bg-white/10 p-5 text-center backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Health score</p>
            <div className="mt-3 flex items-center justify-center gap-2"><CircleGauge size={30} className="text-blue-300" /><p className="text-5xl font-black">{data.health_score}</p></div>
            <p className="mt-2 text-xs text-slate-300">Analytics provider: {data.provider}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Findings items={data.findings} />
        <Recommendations items={data.recommendations} />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck size={21} /></div>
          <div><h2 className="text-lg font-black">AI Guardrails</h2><p className="text-sm text-slate-500">Batas keamanan yang diterapkan pada DashAI.</p></div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.guardrails.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a]">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" />
              <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
