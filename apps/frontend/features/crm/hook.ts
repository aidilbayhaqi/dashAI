import { useQuery } from "@tanstack/react-query";
import type { CRMModuleKey } from "./types";
import { getCRMModuleData } from "./api";

export function useCRMModule(moduleKey: CRMModuleKey) {
  return useQuery({
    queryKey: ["crm", moduleKey],
    queryFn: () => getCRMModuleData(moduleKey),
  });
}