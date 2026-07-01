"use client";

import { ModulePage } from "@/components/modules/module-page";
import { adminModuleConfig } from "./config";
import { useAdminModule } from "./hook";
import type { AdminModuleKey } from "./types";

export function AdminModuleClient({
  moduleKey,
}: {
  moduleKey: AdminModuleKey;
}) {
  const config = adminModuleConfig[moduleKey];
  const { data, isLoading, isError } = useAdminModule(moduleKey);

  return (
    <ModulePage
      {...config}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data administration."
    />
  );
}