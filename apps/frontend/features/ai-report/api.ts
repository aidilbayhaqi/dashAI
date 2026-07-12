import { api } from "@/lib/api";

import type { AIAnalyticsAnswer, AIAnalyticsSummary } from "./types";

function scopeParams(companyId: string) {
  return companyId === "all" ? {} : { company_id: companyId };
}

export async function getAIAnalyticsSummary(
  companyId: string,
): Promise<AIAnalyticsSummary> {
  const response = await api.get<AIAnalyticsSummary>(
    "/api/v1/ai/analytics/summary",
    { params: scopeParams(companyId) },
  );
  return response.data;
}

export async function askAIAnalytics({
  companyId,
  question,
}: {
  companyId: string;
  question: string;
}): Promise<AIAnalyticsAnswer> {
  const response = await api.post<AIAnalyticsAnswer>(
    "/api/v1/ai/analytics/ask",
    {
      question,
      ...(companyId === "all" ? {} : { company_id: companyId }),
    },
  );
  return response.data;
}
