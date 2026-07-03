"use client";

import { ModulePage } from "@/components/modules/module-page";
import { productModuleConfig } from "./config";
import { useProductModule } from "./hook";
import type { ProductModuleKey } from "./types";

export function ProductModuleClient({
  moduleKey,
}: {
  moduleKey: ProductModuleKey;
}) {
  const config = productModuleConfig[moduleKey];
  const { data, isLoading, isError } = useProductModule(moduleKey);

  return (
    <ModulePage
      {...config}
      moduleKey={moduleKey}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data product."
    />
  );
}