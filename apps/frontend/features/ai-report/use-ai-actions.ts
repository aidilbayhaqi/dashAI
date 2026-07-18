"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  confirmAIInvoice,
  confirmAIReport,
  draftFinancialReportWithAI,
  draftInvoiceWithAI,
} from "./api";

export function useAIActions() {
  const queryClient = useQueryClient();

  const invalidateBusinessData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["finance"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-report"] }),
      queryClient.invalidateQueries({ queryKey: ["automation"] }),
    ]);
  };

  return {
    invoiceDraft: useMutation({ mutationFn: draftInvoiceWithAI }),
    invoiceConfirm: useMutation({
      mutationFn: confirmAIInvoice,
      onSuccess: invalidateBusinessData,
    }),
    reportDraft: useMutation({ mutationFn: draftFinancialReportWithAI }),
    reportConfirm: useMutation({
      mutationFn: confirmAIReport,
      onSuccess: invalidateBusinessData,
    }),
  };
}
