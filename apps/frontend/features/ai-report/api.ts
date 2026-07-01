import type { ModuleData } from "@/types/modules";
import type { AIReportModuleKey } from "./types";
import { aiReportDummyData } from "./dummy";
// import { api } from "@/lib/api";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAIReportModuleData(
  moduleKey: AIReportModuleKey
): Promise<ModuleData> {
  await wait(400);

  // NANTI SAAT FETCH API:
  // const response = await api.get("/api/v1/ai/reports/summary");
  // return response.data;

  return aiReportDummyData[moduleKey];
}