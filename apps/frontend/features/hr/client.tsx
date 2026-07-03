"use client";

import { ModulePage } from "@/components/modules/module-page";
import { hrModuleConfig } from "./config";
import { useHRModule } from "./hook";
import type { HRModuleKey } from "./types";
import { HRPerformanceChart } from "./hr-performance-chart";

export function HRModuleClient({ moduleKey }: { moduleKey: HRModuleKey }) {
  const config = hrModuleConfig[moduleKey];
  const { data, isLoading, isError } = useHRModule(moduleKey);

  return (
    <ModulePage
      {...config}
      moduleKey={moduleKey}
      topContent={
        moduleKey === "overview" || moduleKey === "kpi" ? (
          <HRPerformanceChart />
        ) : null
      }
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data HR."
    />
  );
}