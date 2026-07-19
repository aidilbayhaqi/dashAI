"use client";

import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import type { ModuleData } from "@/types/modules";
import { normalizeHRModuleKey, type HRModuleKey } from "./types";
import { getHRModuleData } from "./api";

export function useHRModule(moduleKey: HRModuleKey | string) {
  const selectedCompanyId = useCompanyScope();
  const safeModuleKey = normalizeHRModuleKey(String(moduleKey));
  const fixedCompanyId = getCurrentCompanyId();
  const companyId = fixedCompanyId && !isCurrentUserSuperAdmin()
    ? fixedCompanyId
    : selectedCompanyId !== "all"
      ? selectedCompanyId
      : undefined;

  return useQuery<ModuleData>({
    queryKey: ["hr", safeModuleKey, companyId ?? "all"],
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: () => getHRModuleData({ moduleKey: safeModuleKey, companyId }),
  });
}