"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  Bot,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import { useCompanyScope } from "@/hooks/use-company-scope";
import { getSelectedBranchId } from "@/lib/branch-scope";

import { useAIAgent } from "./use-ai-agent";
import type { AIChatMessage } from "./types";

function generateMessageId() {
  return crypto.randomUUID();
}

export function AIAgentChat() {
  const companyId = useCompanyScope();

  const [question, setQuestion] =
    useState("");

  const [messages, setMessages] =
    useState<AIChatMessage[]>([]);

  const agentMutation = useAIAgent();

  const selectedBranchId = useMemo(
    () => getSelectedBranchId(),
    [],
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedQuestion =
      question.trim();

    if (!normalizedQuestion) {
      return;
    }

    if (!companyId || companyId === "all") {
      return;
    }

    const userMessage: AIChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: normalizedQuestion,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setQuestion("");

    try {
      const response =
        await agentMutation.mutateAsync({
          question: normalizedQuestion,
          companyId: companyId,
          ...(selectedBranchId &&
          selectedBranchId !== "all"
            ? {
                branchId:
                  selectedBranchId,
              }
            : {}),
        });

      const assistantMessage: AIChatMessage =
        {
          id: generateMessageId(),
          role: "assistant",
          content: response.answer,
          createdAt:
            response.generated_at,
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
      setMessages((current) => [
        ...current,
        {
          id: generateMessageId(),
          role: "assistant",
          content:
            "AI Agent belum dapat memproses permintaan. Periksa konfigurasi Gemini, permission, atau koneksi backend.",
          createdAt:
            new Date().toISOString(),
          confidence: "low",
        },
      ]);
    }
  }

  const companyNotSelected =
    !companyId || companyId === "all";

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Sparkles size={20} />
          </div>

          <div>
            <h2 className="font-black text-slate-900 dark:text-white">
              DashAI ERP Analyst
            </h2>

            <p className="text-sm text-slate-500">
              Gemini read-only business
              analysis
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <ShieldCheck size={15} />

          AI hanya dapat membaca data dan
          tidak dapat mengubah transaksi.
        </div>
      </header>

      <div className="min-h-[420px] space-y-4 p-5">
        {messages.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Bot size={28} />
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              Tanyakan kondisi bisnis Anda
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              Contoh: analisis cashflow,
              invoice overdue, risiko stok,
              performa penjualan, atau alert
              operasional.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {message.role ===
              "assistant" ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Bot size={17} />
                </div>
              ) : null}

              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 ${
                  message.role ===
                  "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {message.content}
                </p>

                {message.evidence &&
                message.evidence.length >
                  0 ? (
                  <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Evidence
                    </p>

                    <ul className="mt-2 space-y-1 text-xs">
                      {message.evidence.map(
                        (evidence) => (
                          <li
                            key={evidence}
                          >
                            • {evidence}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}

                {message.suggestedLinks &&
                message.suggestedLinks
                  .length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestedLinks.map(
                      (href) => (
                        <Link
                          key={href}
                          href={href}
                          className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-950"
                        >
                          Buka {href}
                        </Link>
                      ),
                    )}
                  </div>
                ) : null}
              </div>

              {message.role === "user" ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <User size={17} />
                </div>
              ) : null}
            </article>
          ))
        )}

        {agentMutation.isPending ? (
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            <Loader2
              size={18}
              className="animate-spin"
            />

            Gemini sedang menganalisis data
            ERP...
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 p-4 dark:border-slate-800"
      >
        {companyNotSelected ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Pilih company terlebih dahulu
            sebelum menggunakan AI Agent.
          </p>
        ) : null}

        <div className="flex items-end gap-3">
          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(
                event.target.value,
              )
            }
            rows={3}
            maxLength={600}
            disabled={
              companyNotSelected ||
              agentMutation.isPending
            }
            placeholder="Tanyakan sesuatu tentang kondisi bisnis..."
            className="min-h-24 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950"
          />

          <button
            type="submit"
            disabled={
              !question.trim() ||
              companyNotSelected ||
              agentMutation.isPending
            }
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {agentMutation.isPending ? (
              <Loader2
                size={19}
                className="animate-spin"
              />
            ) : (
              <Send size={19} />
            )}
          </button>
        </div>

        <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400">
          <span>
            AI dapat membuat kesalahan.
            Verifikasi keputusan penting.
          </span>

          <span>
            {question.length}/600
          </span>
        </div>
      </form>
    </section>
  );
}