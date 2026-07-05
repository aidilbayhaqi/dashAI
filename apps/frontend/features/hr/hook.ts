"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import { getSelectedCompanyId, useCompanyScope } from "@/lib/company-scope";

import { getHRModuleData } from "./api";
import type { HRModuleKey } from "./types";
import { normalizeHRModuleKey } from "./types";

function getHRCompanyId() {
  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  const isSuperAdmin = isCurrentUserSuperAdmin() || !currentCompanyId;

  if (isSuperAdmin && selectedCompanyId && selectedCompanyId !== "all") {
    return selectedCompanyId;
  }

  if (!isSuperAdmin && currentCompanyId) {
    return currentCompanyId;
  }

  return undefined;
}

export function useHRModule(moduleKey: HRModuleKey | string) {
  const { selectedCompanyId } = useCompanyScope();

  const safeModuleKey = normalizeHRModuleKey(String(moduleKey));
  const companyId = getHRCompanyId();

  return useQuery({
    queryKey: ["hr", safeModuleKey, selectedCompanyId, companyId],
    queryFn: () =>
      getHRModuleData({
        moduleKey: safeModuleKey,
        companyId,
      }),
  });
}