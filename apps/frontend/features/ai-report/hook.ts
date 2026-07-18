"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCompanyScope } from "@/hooks/use-company-scope";

import { askAIAgent, fetchAIReportSummary } from "./api";
import type {
  AIAgentConversationMessage,
  AIAgentResponse,
  AIAnalyticsSummary,
} from "./types";

export type AIAgentAskInput = {
  question: string;
  history: AIAgentConversationMessage[];
};

export function useAIReportModule() {
  const companyId = useCompanyScope();
  const branchId = useBranchScope();

  const summary = useQuery<AIAnalyticsSummary, Error>({
    queryKey: ["ai-report", "overview", companyId, branchId],
    queryFn: () => fetchAIReportSummary({ companyId, branchId }),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  return { companyId, branchId, summary };
}

export function useAIAgentChat({
  companyId,
  branchId,
}: {
  companyId: string;
  branchId?: string;
}) {
  return useMutation<AIAgentResponse, Error, AIAgentAskInput>({
    mutationFn: ({ question, history }) =>
      askAIAgent({ companyId, branchId, question, history }),
  });
}
