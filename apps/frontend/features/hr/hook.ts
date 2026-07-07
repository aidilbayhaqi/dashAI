"use client";

import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";
import type { ModuleData } from "@/types/modules";
import { normalizeHRModuleKey, type HRModuleKey } from "./types";
import { getHRModuleData } from "./api";

export function useHRModule(moduleKey: HRModuleKey | string) {
  const selectedCompanyId = useCompanyScope();
  const safeModuleKey = normalizeHRModuleKey(String(moduleKey));

  return useQuery<ModuleData>({
    queryKey: ["hr", safeModuleKey, selectedCompanyId],
    refetchOnWindowFocus: false,
    queryFn: () => getHRModuleData(safeModuleKey),
  });
}