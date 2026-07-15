"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Database,
  ExternalLink,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  WandSparkles,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-error";

import { useAIReportModule } from "./hook";
import type {
  AIAgentResponse,
  AIAnalyticsFinding,
  AIAnalyticsRecommendation,
  AIAnalyticsSummary,
  AIInsightSeverity,
  AIPriority,
} from "./types";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AIChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;

  provider?: string;
  model?: string;
  confidence?: AIAgentResponse["confidence"];

  evidence?: string[];
  suggestedLinks?: string[];
  toolsUsed?: string[];
};

const severityClass: Record<
  AIInsightSeverity,
  string
> = {
  critical:
    "border-rose-200 bg-rose-50 dark:border-rose-950 dark:bg-rose-950/20",
  warning:
    "border-amber-200 bg-amber-50 dark:border-amber-950 dark:bg-amber-950/20",
  info:
    "border-blue-200 bg-blue-50 dark:border-blue-950 dark:bg-blue-950/20",
};

const priorityClass: Record<
  AIPriority,
  string
> = {
  high:
    "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  low:
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const confidenceClass: Record<
  AIAgentResponse["confidence"],
  string
> = {
  high:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300",
  medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-300",
  low:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300",
};

const quickPrompts = [
  "Analisis kondisi bisnis bulan ini",
  "Apa risiko operasional terbesar saat ini?",
  "Bagaimana kondisi cashflow perusahaan?",
  "Apakah ada invoice overdue yang perlu diperhatikan?",
  "Bagaimana kondisi stok dan persediaan?",
  "Bagaimana performa pipeline CRM?",
];

function createMessageId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSeverityIcon(
  severity: AIInsightSeverity,
) {
  if (severity === "critical") {
    return (
      <AlertTriangle
        size={19}
        className="shrink-0 text-rose-600"
      />
    );
  }

  if (severity === "warning") {
    return (
      <AlertTriangle
        size={19}
        className="shrink-0 text-amber-600"
      />
    );
  }

  return (
    <CheckCircle2
      size={19}
      className="shrink-0 text-blue-600"
    />
  );
}

type AIAnswerMarkdownProps = {
  content: string;
};

function AIAnswerMarkdown({
  content,
}: AIAnswerMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-3 mt-5 text-xl font-black text-slate-950 first:mt-0 dark:text-white">
            {children}
          </h1>
        ),

        h2: ({ children }) => (
          <h2 className="mb-2 mt-5 text-base font-black text-slate-950 first:mt-0 dark:text-white">
            {children}
          </h2>
        ),

        h3: ({ children }) => (
          <h3 className="mb-2 mt-4 text-sm font-black text-slate-900 first:mt-0 dark:text-slate-100">
            {children}
          </h3>
        ),

        p: ({ children }) => (
          <p className="my-2 text-sm font-medium leading-7 text-slate-700 dark:text-slate-200">
            {children}
          </p>
        ),

        strong: ({ children }) => (
          <strong className="font-black text-slate-950 dark:text-white">
            {children}
          </strong>
        ),

        em: ({ children }) => (
          <em className="text-slate-600 dark:text-slate-300">
            {children}
          </em>
        ),

        ul: ({ children }) => (
          <ul className="my-3 space-y-2 pl-1">
            {children}
          </ul>
        ),

        ol: ({ children }) => (
          <ol className="my-3 list-decimal space-y-2 pl-6">
            {children}
          </ol>
        ),

        li: ({ children }) => (
          <li className="flex gap-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />

            <div className="min-w-0">
              {children}
            </div>
          </li>
        ),

        blockquote: ({ children }) => (
          <blockquote className="my-4 rounded-r-2xl border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            {children}
          </blockquote>
        ),

        hr: () => (
          <hr className="my-5 border-slate-200 dark:border-slate-800" />
        ),

        code: ({ children }) => (
          <code className="rounded-md bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AIReportModuleClient() {
  const { summary, ask } = useAIReportModule();

  const [question, setQuestion] =
    useState("");

  const [messages, setMessages] =
    useState<AIChatMessage[]>([]);

  const chatBottomRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, ask.isPending]);

  async function handleAsk(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalized = question.trim();

    if (
      normalized.length < 3 ||
      ask.isPending
    ) {
      return;
    }

    const userMessage: AIChatMessage = {
      id: createMessageId(),
      role: "user",
      content: normalized,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setQuestion("");

    try {
      const response =
        await ask.mutateAsync(normalized);

      const assistantMessage: AIChatMessage =
        {
          id: createMessageId(),
          role: "assistant",
          content: response.answer,
          createdAt:
            response.generated_at,
          provider: response.provider,
          model: response.model,
          confidence:
            response.confidence,
          evidence:
            response.evidence,
          suggestedLinks:
            response.suggested_links,
          toolsUsed:
            response.tools_used,
        };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch {
      // Error ditampilkan menggunakan ask.error.
    }
  }

  function clearConversation() {
    setMessages([]);
    setQuestion("");
    ask.reset();
  }

  if (summary.isLoading) {
    return (
      <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-900" />
    );
  }

  if (
    summary.error ||
    !summary.data
  ) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-950 dark:bg-rose-950/20">
        <h1 className="text-xl font-black text-rose-900 dark:text-rose-200">
          AI analytics gagal dimuat
        </h1>

        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
          {getApiErrorMessage(
            summary.error,
          )}
        </p>

        <button
          type="button"
          onClick={() =>
            void summary.refetch()
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-800"
        >
          <RefreshCw size={15} />
          Coba lagi
        </button>
      </div>
    );
  }

  const data: AIAnalyticsSummary =
  summary.data;

  const latestAssistant =
    [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant",
      );

  return (
    <div className="min-w-0 space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-8 dark:border-slate-800">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black">
                <LockKeyhole size={14} />
                Read-only analytics
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-black text-indigo-100">
                <Sparkles size={14} />
                Gemini ERP Agent
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              {data.headline}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {data.executive_summary}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Database size={14} />
                ERP data
              </span>

              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={14} />
                Tenant scoped
              </span>

              <span className="inline-flex items-center gap-2">
                <LockKeyhole size={14} />
                No write access
              </span>
            </div>
          </div>

          <div className="min-w-44 rounded-[1.5rem] border border-white/15 bg-white/10 p-5 text-center backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">
              Health score
            </p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <CircleGauge
                size={30}
                className="text-blue-300"
              />

              <p className="text-5xl font-black">
                {data.health_score}
              </p>
            </div>

            <p className="mt-2 text-xs text-slate-300">
              Analytics provider:{" "}
              {data.provider}
            </p>
          </div>
        </div>
      </section>

      {/* FINDINGS + RECOMMENDATIONS */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <BrainCircuit size={21} />
            </div>

            <div>
              <h2 className="text-lg font-black">
                Findings
              </h2>

              <p className="text-sm text-slate-500">
                Dihasilkan dari agregat
                dashboard tanpa mengubah
                data.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.findings.length >
            0 ? (
              data.findings.map(
                (finding: AIAnalyticsFinding,) => (
                  <article
                    key={finding.id}
                    className={`rounded-2xl border p-4 ${severityClass[finding.severity]}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(
                        finding.severity,
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          {finding.title}
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          {
                            finding.description
                          }
                        </p>

                        {finding.metric_value ? (
                          <p className="mt-2 text-xs font-black text-slate-700 dark:text-slate-200">
                            {
                              finding.metric_label
                            }
                            :{" "}
                            {
                              finding.metric_value
                            }
                          </p>
                        ) : null}
                      </div>

                      {finding.href ? (
                        <Link
                          href={
                            finding.href
                          }
                          aria-label={`Buka ${finding.title}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-slate-600 transition hover:text-blue-700 dark:bg-slate-950/60 dark:text-slate-300"
                        >
                          <ArrowRight
                            size={17}
                          />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ),
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <CheckCircle2 className="mx-auto text-emerald-600" />

                <p className="mt-3 text-sm font-black">
                  Tidak ada temuan kritis
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Sistem belum menemukan
                  risiko utama pada periode
                  ini.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <WandSparkles
                size={21}
              />
            </div>

            <div>
              <h2 className="text-lg font-black">
                Recommendations
              </h2>

              <p className="text-sm text-slate-500">
                Saran tetap membutuhkan
                keputusan pengguna.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.recommendations.length >
            0 ? (
              data.recommendations.map(
                (item: AIAnalyticsRecommendation,) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${priorityClass[item.priority]}`}
                        >
                          {item.priority}
                        </span>

                        <p className="mt-3 text-sm font-black">
                          {item.title}
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          {item.rationale}
                        </p>
                      </div>

                      {item.href ? (
                        <Link
                          href={item.href}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-900"
                        >
                          <ArrowRight
                            size={17}
                          />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ),
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <p className="text-sm font-black">
                  Belum ada rekomendasi
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Rekomendasi akan muncul
                  berdasarkan kondisi data.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* GEMINI AGENT CHAT */}
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-900 dark:bg-[#050816]">
        <header className="border-b border-slate-200 p-5 sm:p-6 dark:border-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                <Bot size={23} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black">
                    Ask DashAI
                  </h2>

                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300">
                    Read only
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Analisis Finance, Product,
                  HR, CRM, dan Automation
                  menggunakan Gemini.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {latestAssistant?.model ? (
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {
                    latestAssistant.model
                  }
                </span>
              ) : null}

              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={
                    clearConversation
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:hover:border-rose-950 dark:hover:bg-rose-950/20"
                >
                  <Trash2 size={14} />
                  Hapus chat
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <p className="text-xs font-semibold leading-5 text-emerald-800 dark:text-emerald-300">
              Agent hanya dapat membaca data
              sesuai company, branch, dan
              permission akun Anda. Agent
              tidak dapat mengubah transaksi,
              stok, invoice, payroll, ataupun
              automation.
            </p>
          </div>
        </header>

        <div className="grid min-h-[560px] lg:grid-cols-[1fr_280px]">
          <div className="flex min-w-0 flex-col">
            <div className="max-h-[620px] min-h-[420px] flex-1 overflow-y-auto p-4 sm:p-6">
              {messages.length === 0 ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    <MessageSquareText
                      size={28}
                    />
                  </div>

                  <h3 className="mt-5 text-xl font-black">
                    Tanyakan kondisi bisnis
                    Anda
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    DashAI akan membaca data
                    ERP yang tersedia,
                    menggunakan tool
                    read-only, lalu memberikan
                    analisis dan evidence.
                  </p>

                  <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                    {quickPrompts.map(
                      (prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() =>
                            setQuestion(
                              prompt,
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                        >
                          {prompt}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map(
                    (message) => (
                      <article
                        key={message.id}
                        className={`flex items-start gap-3 ${
                          message.role ===
                          "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.role ===
                        "assistant" ? (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                            <Bot size={17} />
                          </div>
                        ) : null}

                        <div
                          className={`max-w-[88%] rounded-3xl px-4 py-3 sm:max-w-[80%] ${
                            message.role ===
                            "user"
                              ? "rounded-br-md bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                              : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                          }`}
                        >
                          {message.role === "assistant" ? (
                              <AIAnswerMarkdown
                                content={message.content}
                              />
                            ) : (
                              <p className="whitespace-pre-wrap text-sm font-medium leading-6">
                                {message.content}
                              </p>
                            )}

                          {message.role ===
                            "assistant" &&
                          message.confidence ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${confidenceClass[message.confidence]}`}
                              >
                                Confidence:{" "}
                                {
                                  message.confidence
                                }
                              </span>

                              {message.provider ? (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                                  {
                                    message.provider
                                  }
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {message.toolsUsed &&
                          message.toolsUsed.length > 0 ? (
                            <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-bold text-emerald-700 dark:border-slate-800 dark:text-emerald-300">
                              <ShieldCheck size={14} />

                              Data telah diverifikasi dari sistem ERP
                            </div>
                          ) : null}

                          {message.evidence &&
                          message.evidence
                            .length > 0 ? (
                            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Evidence
                              </p>

                              <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                                {message.evidence.map(
                                  (
                                    evidence,
                                  ) => (
                                    <li
                                      key={
                                        evidence
                                      }
                                      className="flex gap-2"
                                    >
                                      <ChevronRight
                                        size={
                                          14
                                        }
                                        className="mt-0.5 shrink-0 text-blue-600"
                                      />

                                      <span>
                                        {
                                          evidence
                                        }
                                      </span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          ) : null}

                          {message.suggestedLinks &&
                          message.suggestedLinks
                            .length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {message.suggestedLinks.map(
                                (href) => (
                                  <Link
                                    key={
                                      href
                                    }
                                    href={
                                      href
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-50 dark:border-blue-950 dark:bg-slate-900 dark:text-blue-300"
                                  >
                                    Buka
                                    halaman
                                    <ExternalLink
                                      size={
                                        12
                                      }
                                    />
                                  </Link>
                                ),
                              )}
                            </div>
                          ) : null}

                          <p
                            className={`mt-3 text-[10px] font-semibold ${
                              message.role ===
                              "user"
                                ? "text-slate-300 dark:text-slate-500"
                                : "text-slate-400"
                            }`}
                          >
                            {formatMessageTime(
                              message.createdAt,
                            )}
                          </p>
                        </div>

                        {message.role ===
                        "user" ? (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <UserRound
                              size={17}
                            />
                          </div>
                        ) : null}
                      </article>
                    ),
                  )}

                  {ask.isPending ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                        <Bot size={17} />
                      </div>

                      <div className="rounded-3xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                          <Loader2
                            size={17}
                            className="animate-spin text-blue-600"
                          />

                          Gemini sedang
                          menganalisis data
                          ERP...
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div
                    ref={chatBottomRef}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 sm:p-5 dark:border-slate-800">
              {ask.error ? (
                <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300">
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {getApiErrorMessage(
                      ask.error,
                    )}
                  </span>
                </div>
              ) : null}

              <form
                onSubmit={handleAsk}
                className="flex items-end gap-3"
              >
                <div className="min-w-0 flex-1">
                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(
                        event.target
                          .value,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={3}
                    maxLength={600}
                    disabled={
                      ask.isPending
                    }
                    placeholder="Tanyakan revenue, invoice, stock, CRM, HR, atau automation..."
                    className="min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-[#02040a] dark:focus:ring-blue-950"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] font-semibold text-slate-400">
                    <span>
                      Enter untuk kirim ·
                      Shift + Enter untuk baris
                      baru
                    </span>

                    <span>
                      {question.length}/600
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    ask.isPending ||
                    question.trim().length <
                      3
                  }
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Kirim pertanyaan"
                >
                  {ask.isPending ? (
                    <Loader2
                      className="animate-spin"
                      size={18}
                    />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* CHAT SIDEBAR */}
          <aside className="hidden border-l border-slate-200 bg-slate-50/70 p-5 lg:block dark:border-slate-800 dark:bg-slate-950/40">
            <h3 className="text-sm font-black">
              Quick questions
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Pilih salah satu pertanyaan
              untuk memulai analisis.
            </p>

            <div className="mt-4 space-y-2">
              {quickPrompts.map(
                (prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() =>
                      setQuestion(prompt)
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-800 dark:bg-[#050816] dark:text-slate-300"
                  >
                    <span>{prompt}</span>

                    <ArrowRight
                      size={14}
                      className="shrink-0"
                    />
                  </button>
                ),
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
              <p className="flex items-center gap-2 text-xs font-black text-blue-800 dark:text-blue-300">
                <ShieldCheck
                  size={15}
                />
                Human review
              </p>

              <p className="mt-2 text-xs font-semibold leading-5 text-blue-700/80 dark:text-blue-300/80">
                AI dapat membuat kesalahan.
                Periksa evidence sebelum
                mengambil keputusan bisnis.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* GUARDRAILS */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-900 dark:bg-[#050816]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck size={21} />
          </div>

          <div>
            <h2 className="text-lg font-black">
              AI Guardrails
            </h2>

            <p className="text-sm text-slate-500">
              Pembatasan akses dan keamanan
              yang diterapkan pada DashAI.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.guardrails.map(
            (item: string) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a]"
              >
                <ShieldCheck
                  size={17}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {item}
                </p>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}