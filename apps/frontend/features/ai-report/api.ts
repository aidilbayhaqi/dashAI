import { api } from "@/lib/api";

import type {
  AIAgentResponse,
  AIAnalyticsSummary,
} from "./types";

type AIScope = {
  companyId: string;
  branchId?: string;
};

function buildScopeParams({
  companyId,
  branchId,
}: AIScope) {
  return {
    ...(companyId &&
    companyId !== "all"
      ? {
          company_id: companyId,
        }
      : {}),

    ...(branchId &&
    branchId !== "all"
      ? {
          branch_id: branchId,
        }
      : {}),
  };
}

export async function fetchAIReportSummary({
  companyId,
  branchId,
}: AIScope): Promise<AIAnalyticsSummary> {
  const response =
    await api.get<AIAnalyticsSummary>(
      "/api/v1/ai/analytics/summary",
      {
        params: buildScopeParams({
          companyId,
          branchId,
        }),
      },
    );

  return response.data;
}

export async function askAIAgent({
  companyId,
  branchId,
  question,
}: AIScope & {
  question: string;
}): Promise<AIAgentResponse> {
  const response =
    await api.post<AIAgentResponse>(
      "/api/v1/ai/analytics/agent/chat",
      {
        question,

        ...buildScopeParams({
          companyId,
          branchId,
        }),
      },
    );

  return response.data;
}

/*
 * Compatibility aliases.
 *
 * Dipertahankan agar file lama yang masih mengimpor
 * getAIAnalyticsSummary tidak langsung rusak.
 */
export const getAIAnalyticsSummary =
  fetchAIReportSummary;