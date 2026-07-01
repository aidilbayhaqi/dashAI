"use client";

import { ModulePage } from "@/components/modules/module-page";
import { hrModuleConfig } from "./config";
import { useHRModule } from "./hook";
import type { HRModuleKey } from "./types";

export function HRModuleClient({ moduleKey }: { moduleKey: HRModuleKey }) {
  const config = hrModuleConfig[moduleKey];
  const { data, isLoading, isError } = useHRModule(moduleKey);

  return (
    <ModulePage
      {...config}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data HR."
    />
  );
}