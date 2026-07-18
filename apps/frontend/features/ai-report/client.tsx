"use client";

import { RefreshCw } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-error";

import { AIAgentActions } from "./ai-agent-actions";
import { AIChatPanel } from "./components/ai-chat-panel";
import { AIOverview } from "./components/ai-overview";
import { useAIReportModule } from "./hook";

export function AIReportModuleClient() {
  const { companyId, branchId, summary } = useAIReportModule();

  if (summary.isLoading) {
    return <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-900" />;
  }

  if (summary.error || !summary.data) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-950 dark:bg-rose-950/20">
        <h1 className="text-xl font-black text-rose-900 dark:text-rose-200">AI analytics gagal dimuat</h1>
        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{getApiErrorMessage(summary.error)}</p>
        <button type="button" onClick={() => void summary.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white hover:bg-rose-800"><RefreshCw size={15} /> Coba lagi</button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <AIOverview data={summary.data} />
      <AIAgentActions />
      <AIChatPanel companyId={companyId} branchId={branchId} />
    </div>
  );
}
