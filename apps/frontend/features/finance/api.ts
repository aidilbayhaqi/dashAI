import type { ModuleData } from "@/types/modules";
import type { FinanceModuleKey } from "./types";
import { getFinanceModuleData as getFinanceModuleDataFromService } from "./service";

export async function getFinanceModuleData(
  moduleKey: FinanceModuleKey | string
): Promise<ModuleData> {
  return getFinanceModuleDataFromService(
    String(moduleKey || "overview") as FinanceModuleKey
  );
}