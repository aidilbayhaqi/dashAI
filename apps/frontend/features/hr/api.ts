import type { ModuleData } from "@/types/modules";
import type { HRModuleKey } from "./types";
import { hrDummyData } from "./dummy";
// import { api } from "@/lib/api";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getHRModuleData(
  moduleKey: HRModuleKey
): Promise<ModuleData> {
  await wait(400);

  // NANTI SAAT FETCH API:
  // const response = await api.get(`/api/v1/hr/${moduleKey}`);
  // return response.data;

  return hrDummyData[moduleKey];
}