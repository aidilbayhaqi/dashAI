"use client";

import { useEffect, useState } from "react";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import {
  getSelectedCompanyId,
  subscribeCompanyScope,
  type CompanyScopeValue,
} from "@/lib/company-scope";

export function useCompanyScope() {
  const [selectedCompanyId, setSelectedCompanyIdState] =
    useState<CompanyScopeValue>(() => {
      const fixedCompanyId = getCurrentCompanyId();
      if (fixedCompanyId && !isCurrentUserSuperAdmin()) return fixedCompanyId;
      return getSelectedCompanyId();
    });

  useEffect(() => {
    function syncCompanyScope() {
      const fixedCompanyId = getCurrentCompanyId();
      setSelectedCompanyIdState(
        fixedCompanyId && !isCurrentUserSuperAdmin()
          ? fixedCompanyId
          : getSelectedCompanyId(),
      );
    }

    syncCompanyScope();

    return subscribeCompanyScope(syncCompanyScope);
  }, []);

  return selectedCompanyId;
}