"use client";

import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";
import { getModuleData } from "@/lib/module-data";
import { normalizeModuleKey } from "@/lib/module-registry";
import type { ModuleData } from "@/types/modules";
import type { CRMModuleKey } from "./types";

export function useCRMModule(moduleKey: CRMModuleKey | string) {
  const selectedCompanyId = useCompanyScope();
  const safeModuleKey = normalizeModuleKey("crm", String(moduleKey));

  return useQuery<ModuleData>({
    queryKey: ["crm", safeModuleKey, selectedCompanyId],
    refetchOnWindowFocus: false,
    queryFn: () => getModuleData("crm", safeModuleKey),
  });
}