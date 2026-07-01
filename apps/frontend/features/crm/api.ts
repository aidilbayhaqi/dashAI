import type { ModuleData } from "@/types/modules";
import type { CRMModuleKey } from "./types";
import { crmDummyData } from "./dummy";
// import { api } from "@/lib/api";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCRMModuleData(
  moduleKey: CRMModuleKey
): Promise<ModuleData> {
  await wait(400);

  // NANTI SAAT FETCH API:
  // const response = await api.get(`/api/v1/crm/${moduleKey}`);
  // return response.data;

  return crmDummyData[moduleKey];
}