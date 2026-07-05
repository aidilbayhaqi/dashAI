"use client";

import { useEffect, useState } from "react";

const SELECTED_COMPANY_KEY = "dashai_selected_company_id";
const COMPANY_SCOPE_EVENT = "dashai_company_scope_changed";

export const ALL_COMPANIES_VALUE = "all";

export type CompanyScopeValue = string;

export function getSelectedCompanyId(): CompanyScopeValue {
  if (typeof window === "undefined") return ALL_COMPANIES_VALUE;

  return localStorage.getItem(SELECTED_COMPANY_KEY) || ALL_COMPANIES_VALUE;
}

export function setSelectedCompanyId(companyId: CompanyScopeValue) {
  if (typeof window === "undefined") return;

  const normalizedCompanyId = companyId || ALL_COMPANIES_VALUE;

  localStorage.setItem(SELECTED_COMPANY_KEY, normalizedCompanyId);

  window.dispatchEvent(new Event(COMPANY_SCOPE_EVENT));
}

export function resetSelectedCompanyId() {
  setSelectedCompanyId(ALL_COMPANIES_VALUE);
}

export function subscribeCompanyScope(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(COMPANY_SCOPE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(COMPANY_SCOPE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useCompanyScope() {
  const [selectedCompanyId, setSelectedCompanyIdState] =
    useState<CompanyScopeValue>(ALL_COMPANIES_VALUE);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function syncSelectedCompanyId() {
      setSelectedCompanyIdState(getSelectedCompanyId());
    }

    syncSelectedCompanyId();

    return subscribeCompanyScope(syncSelectedCompanyId);
  }, []);

  function updateSelectedCompanyId(companyId: CompanyScopeValue) {
    setSelectedCompanyId(companyId);
    setSelectedCompanyIdState(companyId || ALL_COMPANIES_VALUE);
  }

  function resetCompanyScope() {
    resetSelectedCompanyId();
    setSelectedCompanyIdState(ALL_COMPANIES_VALUE);
  }

  return {
    selectedCompanyId,
    setSelectedCompanyId: updateSelectedCompanyId,
    resetSelectedCompanyId: resetCompanyScope,
    isAllCompanies: selectedCompanyId === ALL_COMPANIES_VALUE,
  };
}