"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-error";

import { useAIAgentChat } from "../hook";
import type { AIChatMessage } from "../types";
import { buildConversationHistory } from "../utils";
import { AIAnswerMarkdown } from "./ai-answer-markdown";

const quickPrompts = [
  "Analisis kondisi bisnis bulan ini",
  "Apa risiko operasional terbesar saat ini?",
  "Bagaimana kondisi cashflow perusahaan?",
  "Apakah ada invoice overdue yang perlu diperhatikan?",
  "Bagaimana kondisi stok dan persediaan?",
  "Bagaimana performa pipeline CRM?",
];

function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AIChatPanel({
  companyId,
  branchId,
}: {
  companyId: string;
  branchId?: string;
}) {
  const ask = useAIAgentChat({ companyId, branchId });
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, ask.isPending]);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = question.trim();
    if (normalized.length < 3 || ask.isPending) return;

    const history = buildConversationHistory(messages);
    const userMessage: AIChatMessage = {
      id: createMessageId(),
      role: "user",
      content: normalized,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");

    try {
      const response = await ask.mutateAsync({ question: normalized, history });
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.answer,
          createdAt: response.generated_at,
          provider: response.provider,
          model: response.model,
          confidence: response.confidence,
          evidence: response.evidence,
          suggestedLinks: response.suggested_links,
          toolsUsed: response.tools_used,
          warnings: response.warnings,
          degraded: response.degraded,
        },
      ]);
    } catch {
      // The mutation error is rendered below the conversation.
    }
  }

  function clearConversation() {
    setMessages([]);
    setQuestion("");
    ask.reset();
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-900 dark:bg-[#050816]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <MessageSquareText size={20} />
          </div>
          <div>
            <h2 className="font-black">DashAI Business Analyst</h2>
            <p className="text-xs text-slate-500">Read-only, tenant scoped, dan sekarang memahami 8 pesan terakhir.</p>
          </div>
        </div>
        {messages.length ? (
          <button type="button" onClick={clearConversation} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 dark:border-slate-800">
            <Trash2 size={14} /> Bersihkan
          </button>
        ) : null}
      </header>

      <div className="grid lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <div className="max-h-[38rem] min-h-[24rem] overflow-y-auto p-4 sm:p-5">
            {!messages.length ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <Bot size={34} className="text-blue-500" />
                <p className="mt-3 text-sm font-black">Tanyakan kondisi bisnis kamu</p>
                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">AI mengambil data melalui ERP tools. Ia tidak memiliki akses SQL atau write action.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message) => (
                  <article key={message.id} className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                    {message.role === "assistant" ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white"><Bot size={17} /></div>
                    ) : null}
                    <div className={`max-w-[88%] rounded-3xl px-4 py-3 ${message.role === "user" ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"}`}>
                      {message.role === "assistant" ? <AIAnswerMarkdown content={message.content} /> : <p className="whitespace-pre-wrap text-sm font-semibold leading-6">{message.content}</p>}
                      <div className={`mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold ${message.role === "user" ? "text-blue-100" : "text-slate-400"}`}>
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {message.provider ? <span>· {message.provider}</span> : null}
                        {message.model ? <span>· {message.model}</span> : null}
                        {message.confidence ? <span>· confidence {message.confidence}</span> : null}
                      </div>
                      {message.warnings?.map((warning) => (
                        <p key={warning} className="mt-3 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{warning}</p>
                      ))}
                      {message.evidence?.length ? (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#050816]">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Evidence</p>
                          <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {message.evidence.map((item) => <li key={item}>• {item}</li>)}
                          </ul>
                        </div>
                      ) : null}
                      {message.suggestedLinks?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.suggestedLinks.map((href) => (
                            <Link key={href} href={href} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-blue-700 dark:border-slate-800 dark:bg-[#050816]">
                              Buka modul <ExternalLink size={11} />
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {message.role === "user" ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><UserRound size={17} /></div>
                    ) : null}
                  </article>
                ))}
                {ask.isPending ? (
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-500"><Loader2 size={17} className="animate-spin text-blue-600" /> DashAI sedang menganalisis ERP...</div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 sm:p-5 dark:border-slate-800">
            {ask.error ? (
              <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" /> {getApiErrorMessage(ask.error)}
              </div>
            ) : null}
            <form onSubmit={handleAsk} className="flex items-end gap-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={3}
                maxLength={600}
                disabled={ask.isPending}
                placeholder="Tanyakan revenue, invoice, stock, CRM, HR, atau automation..."
                className="min-h-24 min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-[#02040a] dark:focus:ring-blue-950"
              />
              <button type="submit" disabled={ask.isPending || question.trim().length < 3} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white disabled:opacity-50" aria-label="Kirim pertanyaan">
                {ask.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </div>

        <aside className="hidden border-l border-slate-200 bg-slate-50/70 p-5 lg:block dark:border-slate-800 dark:bg-slate-950/40">
          <h3 className="text-sm font-black">Quick questions</h3>
          <div className="mt-4 space-y-2">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs font-bold text-slate-600 hover:text-blue-700 dark:border-slate-800 dark:bg-[#050816] dark:text-slate-300">
                <span>{prompt}</span><ArrowRight size={14} />
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
            <p className="flex items-center gap-2 text-xs font-black text-blue-800 dark:text-blue-300"><ShieldCheck size={15} /> Human review</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-blue-700/80 dark:text-blue-300/80">Periksa evidence sebelum mengambil keputusan bisnis.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
