"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";

import { askAIAnalytics, getAIAnalyticsSummary } from "./api";

export function useAIReportModule() {
  const companyId = useCompanyScope();
  const summary = useQuery({
    queryKey: ["ai-report", "overview", companyId],
    queryFn: () => getAIAnalyticsSummary(companyId),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
  const ask = useMutation({
    mutationFn: (question: string) => askAIAnalytics({ companyId, question }),
  });

  return { companyId, summary, ask };
}
