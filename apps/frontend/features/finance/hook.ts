"use client";

import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";
import type { ModuleData } from "@/types/modules";
import type { FinanceModuleKey } from "./types";
import { getFinanceModuleData } from "./service";

function normalizeFinanceModuleKey(value: string): FinanceModuleKey {
  const key = String(value || "overview").toLowerCase();

  const map: Record<string, FinanceModuleKey> = {
    overview: "overview",

    transactions: "transactions",
    transaction: "transactions",

    invoices: "invoices",
    invoice: "invoices",

    cashflow: "cashflow",
    cashflows: "cashflow",
    "cashflow-snapshots": "cashflow",

    taxes: "taxes",
    tax: "taxes",
    "tax-records": "taxes",

    ledger: "ledger",
    ledgers: "ledger",
    "general-ledger": "ledger",
    "journal-entries": "ledger",
  };

  return map[key] ?? "overview";
}

export function useFinanceModule(moduleKey: FinanceModuleKey | string) {
  const selectedCompanyId = useCompanyScope();
  const safeModuleKey = normalizeFinanceModuleKey(String(moduleKey));

  return useQuery<ModuleData>({
    queryKey: ["finance", safeModuleKey, selectedCompanyId],
    refetchOnWindowFocus: false,
    queryFn: () => getFinanceModuleData(safeModuleKey),
  });
}