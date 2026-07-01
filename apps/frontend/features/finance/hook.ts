import { useQuery } from "@tanstack/react-query";
import type { FinanceModuleKey } from "./types";
import { getFinanceModuleData } from "./api";

export function useFinanceModule(moduleKey: FinanceModuleKey) {
  return useQuery({
    queryKey: ["finance", moduleKey],
    queryFn: () => getFinanceModuleData(moduleKey),
  });
}