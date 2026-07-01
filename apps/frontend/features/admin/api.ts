import type { ModuleData } from "@/types/modules";
import type { AdminModuleKey } from "./types";
import { adminDummyData } from "./dummy";
// import { api } from "@/lib/api";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAdminModuleData(
  moduleKey: AdminModuleKey
): Promise<ModuleData> {
  await wait(400);

  // NANTI SAAT FETCH API:
  // const response = await api.get(`/api/v1/admin/${moduleKey}`);
  // return response.data;

  return adminDummyData[moduleKey];
}