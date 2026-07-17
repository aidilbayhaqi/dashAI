"use client";

import { useMutation } from "@tanstack/react-query";

import {
  confirmAIInvoice,
  confirmAIReport,
  draftFinancialReportWithAI,
  draftInvoiceWithAI,
} from "./api";

export function useAIActions() {
  return {
    invoiceDraft: useMutation({ mutationFn: draftInvoiceWithAI }),
    invoiceConfirm: useMutation({ mutationFn: confirmAIInvoice }),
    reportDraft: useMutation({ mutationFn: draftFinancialReportWithAI }),
    reportConfirm: useMutation({ mutationFn: confirmAIReport }),
  };
}
