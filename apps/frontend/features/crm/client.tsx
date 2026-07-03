"use client";

import { ModulePage } from "@/components/modules/module-page";
import { crmModuleConfig } from "./config";
import { useCRMModule } from "./hook";
import type { CRMModuleKey } from "./types";
import { CRMFunnelChart } from "./crm-funnel-chart";

export function CRMModuleClient({ moduleKey }: { moduleKey: CRMModuleKey }) {
  const config = crmModuleConfig[moduleKey];
  const { data, isLoading, isError } = useCRMModule(moduleKey);

  return (
    <ModulePage
      {...config}
      moduleKey={moduleKey}
      topContent={
        moduleKey === "overview" ||
        moduleKey === "leads" ||
        moduleKey === "pipeline" ? (
          <CRMFunnelChart />
        ) : null
      }
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data CRM."
    />
  );
}