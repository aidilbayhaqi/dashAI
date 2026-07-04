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

  const {
    data,
    isLoading,
    isPending,
    isFetching,
    isError,
  } = useProductModule(moduleKey);

  const shouldShowSkeleton = isLoading || isPending || (isFetching && !data);

  return (
    <ModulePage
      {...config}
      moduleKey={moduleKey}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={shouldShowSkeleton}
      isError={isError}
      emptyMessage="Belum ada data product."
    />
  );
}