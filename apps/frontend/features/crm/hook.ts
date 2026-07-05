"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import {
  getSelectedCompanyId,
  useCompanyScope,
} from "@/lib/company-scope";

import { getCRMModuleData } from "./api";
import type { CRMModuleKey } from "./types";
import { normalizeCRMModuleKey } from "./types";

function getCRMCompanyId() {
  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  const canChooseCompany = isCurrentUserSuperAdmin() || !currentCompanyId;

  if (
    canChooseCompany &&
    selectedCompanyId &&
    selectedCompanyId !== "all"
  ) {
    return selectedCompanyId;
  }

  if (!canChooseCompany && currentCompanyId) {
    return currentCompanyId;
  }

  return undefined;
}

export function useCRMModule(moduleKey: CRMModuleKey | string) {
  const { selectedCompanyId } = useCompanyScope();

  const safeModuleKey = normalizeCRMModuleKey(String(moduleKey));
  const companyId = getCRMCompanyId();

  return useQuery({
    queryKey: ["crm", safeModuleKey, selectedCompanyId, companyId],
    queryFn: () =>
      getCRMModuleData({
        moduleKey: safeModuleKey,
        companyId,
      }),
  });
}