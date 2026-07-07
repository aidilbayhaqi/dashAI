"use client";

import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";
import type { ModuleData } from "@/types/modules";

import { getCRMModuleData } from "./api";
import {
  normalizeCRMModuleKey,
  type CRMModuleKey,
} from "./types";

export function useCRMModule(
  moduleKey: CRMModuleKey | string
) {
  const selectedCompanyId = useCompanyScope();

  const safeModuleKey =
    normalizeCRMModuleKey(String(moduleKey));

  const companyId =
    selectedCompanyId &&
    selectedCompanyId !== "all"
      ? selectedCompanyId
      : undefined;

  return useQuery<ModuleData>({
    queryKey: [
      "crm",
      safeModuleKey,
      selectedCompanyId,
    ],

    refetchOnWindowFocus: false,

    queryFn: () =>
      getCRMModuleData({
        moduleKey: safeModuleKey,
        companyId,
      }),
  });
}