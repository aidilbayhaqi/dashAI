import type { ModuleData } from "@/types/modules";
import type { FinanceModuleKey } from "./types";
import { financeDummyData } from "./dummy";
// import { api } from "@/lib/api";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFinanceModuleData(
  moduleKey: FinanceModuleKey
): Promise<ModuleData> {
  await wait(400);

  // NANTI SAAT FETCH API:
  // const response = await api.get(`/api/v1/finance/${moduleKey}`);
  // return response.data;

  return financeDummyData[moduleKey];
}