import { api } from "@/lib/api";
import {
  clearIdempotencyKey,
  idempotencyHeaders,
  retainIdempotencyKey,
} from "@/lib/idempotency";

import type {
  AIAgentConversationMessage,
  AIAgentResponse,
  AIAnalyticsSummary,
  AIInvoiceDraft,
  AIInvoiceDraftResponse,
  AIReportDraftResponse,
  AIFinancialReportDraft,
  AIReportExecutionResponse,
  CreatedInvoice,
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
  history = [],
}: AIScope & {
  question: string;
  history?: AIAgentConversationMessage[];
}): Promise<AIAgentResponse> {
  const response =
    await api.post<AIAgentResponse>(
      "/api/v1/ai/analytics/agent/chat",
      {
        question,
        history: history.slice(-8),

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

export async function draftInvoiceWithAI({
  companyId,
  branchId,
  instruction,
}: AIScope & {
  instruction: string;
}): Promise<AIInvoiceDraftResponse> {
  const response = await api.post<AIInvoiceDraftResponse>(
    "/api/v1/ai/analytics/agent/invoice/draft",
    {
      instruction,
      ...buildScopeParams({ companyId, branchId }),
    },
  );
  return response.data;
}

export async function confirmAIInvoice({
  draftId,
  actionToken,
  draft,
}: {
  draftId: string;
  actionToken: string;
  draft: AIInvoiceDraft;
}): Promise<CreatedInvoice> {
  const body = {
    draft_id: draftId,
    action_token: actionToken,
    draft,
  };
  const operation = "ai-invoice-confirm";
  const idempotency = idempotencyHeaders(operation, body);
  try {
    const response = await api.post<CreatedInvoice>(
      "/api/v1/ai/analytics/agent/invoice/confirm",
      body,
      { headers: idempotency.headers },
    );
    retainIdempotencyKey(operation, body, idempotency.key);
    return response.data;
  } catch (error) {
    clearIdempotencyKey(operation, body, idempotency.key);
    throw error;
  }
}

export async function draftFinancialReportWithAI({
  companyId,
  branchId,
  instruction,
}: AIScope & {
  instruction: string;
}): Promise<AIReportDraftResponse> {
  const response = await api.post<AIReportDraftResponse>(
    "/api/v1/ai/analytics/agent/report/draft",
    {
      instruction,
      ...buildScopeParams({ companyId, branchId }),
    },
  );
  return response.data;
}

export async function confirmAIReport({
  draftId,
  actionToken,
  draft,
}: {
  draftId: string;
  actionToken: string;
  draft: AIFinancialReportDraft;
}): Promise<AIReportExecutionResponse> {
  const body = {
    draft_id: draftId,
    action_token: actionToken,
    draft,
  };
  const operation = "ai-report-confirm";
  const idempotency = idempotencyHeaders(operation, body);
  try {
    const response = await api.post<AIReportExecutionResponse>(
      "/api/v1/ai/analytics/agent/report/confirm",
      body,
      { headers: idempotency.headers },
    );
    retainIdempotencyKey(operation, body, idempotency.key);
    return response.data;
  } catch (error) {
    clearIdempotencyKey(operation, body, idempotency.key);
    throw error;
  }
}
