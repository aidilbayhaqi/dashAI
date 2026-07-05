"use client";

import { useEffect, useState } from "react";
import {
  getSelectedCompanyId,
  subscribeCompanyScope,
  type CompanyScopeValue,
} from "@/lib/company-scope";

export function useCompanyScope() {
  const [selectedCompanyId, setSelectedCompanyIdState] =
    useState<CompanyScopeValue>("all");

  useEffect(() => {
    function syncCompanyScope() {
      setSelectedCompanyIdState(getSelectedCompanyId());
    }

    syncCompanyScope();

    return subscribeCompanyScope(syncCompanyScope);
  }, []);

  return selectedCompanyId;
}