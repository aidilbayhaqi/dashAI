"use client";

import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCompanyScope } from "@/hooks/use-company-scope";

import {
  askAIAgent,
  fetchAIReportSummary,
} from "./api";

import type {
  AIAgentResponse,
  AIAnalyticsSummary,
} from "./types";

export function useAIReportModule() {
  const companyId =
    useCompanyScope();

  const branchId =
    useBranchScope();

  const summary = useQuery<
    AIAnalyticsSummary,
    Error
  >({
    queryKey: [
      "ai-report",
      "overview",
      companyId,
      branchId,
    ],

    queryFn: () =>
      fetchAIReportSummary({
        companyId,
        branchId,
      }),

    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  const ask = useMutation<
    AIAgentResponse,
    Error,
    string
  >({
    mutationFn: (
      question: string,
    ) =>
      askAIAgent({
        companyId,
        branchId,
        question,
      }),
  });

  return {
    companyId,
    branchId,
    summary,
    ask,
  };
}