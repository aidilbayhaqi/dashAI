"use client";

import { FinanceModulePage } from "@/components/modules/finance-module-page";
import { financeModuleConfig } from "./config";
import { useFinanceModule } from "./hook";
import type { FinanceModuleKey } from "./types";

export function FinanceModuleClient({
  moduleKey,
}: {
  moduleKey: FinanceModuleKey;
}) {
  const config = financeModuleConfig[moduleKey];
  const { data, isLoading, isError } = useFinanceModule(moduleKey);

  return (
    <FinanceModulePage
      {...config}
      moduleKey={moduleKey}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data finance."
    />
  );
}