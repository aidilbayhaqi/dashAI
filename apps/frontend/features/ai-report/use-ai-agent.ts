"use client";

import { useMutation } from "@tanstack/react-query";

import { askAIAgent } from "./api";
import type { AIAgentResponse } from "./types";

export type UseAIAgentPayload = {
  question: string;
  companyId: string;
  branchId?: string;
};

export function useAIAgent() {
  return useMutation<
    AIAgentResponse,
    Error,
    UseAIAgentPayload
  >({
    mutationFn: ({
      question,
      companyId,
      branchId,
    }) =>
      askAIAgent({
        question,
        companyId,
        branchId,
      }),
  });
}