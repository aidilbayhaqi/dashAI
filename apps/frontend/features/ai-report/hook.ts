import { useQuery } from "@tanstack/react-query";
import type { AIReportModuleKey } from "./types";
import { getAIReportModuleData } from "./api";

export function useAIReportModule(moduleKey: AIReportModuleKey) {
  return useQuery({
    queryKey: ["ai-report", moduleKey],
    queryFn: () => getAIReportModuleData(moduleKey),
  });
}