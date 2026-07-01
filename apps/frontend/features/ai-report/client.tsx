"use client";

import { ModulePage } from "@/components/modules/module-page";
import { aiReportModuleConfig } from "./config";
import { useAIReportModule } from "./hook";
import type { AIReportModuleKey } from "./types";

export function AIReportModuleClient({
  moduleKey,
}: {
  moduleKey: AIReportModuleKey;
}) {
  const config = aiReportModuleConfig[moduleKey];
  const { data, isLoading, isError } = useAIReportModule(moduleKey);

  return (
    <ModulePage
      {...config}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data AI report."
    />
  );
}