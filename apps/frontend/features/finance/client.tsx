"use client";

import { ModulePage } from "@/components/modules/module-page";
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
    <ModulePage
      {...config}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data finance."
    />
  );
}