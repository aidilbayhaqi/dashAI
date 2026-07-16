"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runSequentialImport } from "@/lib/import-batch";

import { ModulePage } from "@/components/modules/module-page";
import { CompanyScopeFilter } from "@/components/modules/company-scope-filter";
import {
  createModuleRecord,
  deleteModuleRecord,
  updateModuleRecord,
} from "@/lib/module-crud";
import { isCurrentUserSuperAdmin, getCurrentCompanyId } from "@/lib/auth-scope";
import type { ModuleRow } from "@/types/modules";

import { productModuleConfig } from "./config";
import { useProductModule } from "./hook";
import type { ProductModuleKey } from "./types";

type MutationState = {
  isPending?: boolean;
  isLoading?: boolean;
};

function getMutationLoadingState(mutation: MutationState) {
  return mutation.isPending ?? mutation.isLoading ?? false;
}

export function ProductModuleClient({
  moduleKey,
}: {
  moduleKey: ProductModuleKey;
}) {
  const config = productModuleConfig[moduleKey];
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useProductModule(moduleKey);

  const currentCompanyId = getCurrentCompanyId();
const canShowCompanyFilter = isCurrentUserSuperAdmin() || !currentCompanyId;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["product"],
    });
  }

  const createMutation = useMutation({
    mutationFn: (payload: ModuleRow) =>
      createModuleRecord({
        featureKey: "product",
        moduleKey,
        payload,
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModuleRow }) =>
      updateModuleRecord({
        featureKey: "product",
        moduleKey,
        id,
        payload,
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteModuleRecord({
        featureKey: "product",
        moduleKey,
        id,
      }),
    onSuccess: invalidate,
  });

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
      topContent={canShowCompanyFilter ? <CompanyScopeFilter /> : null}
      onImportRecords={(rows) =>
        runSequentialImport(rows, (payload) =>
          createMutation.mutateAsync(payload),
        )
      }
      onCreateRecord={(payload) => createMutation.mutateAsync(payload)}
      onUpdateRecord={(id, payload) =>
        updateMutation.mutateAsync({
          id,
          payload,
        })
      }
      onDeleteRecord={(id) => deleteMutation.mutateAsync(id)}
      isCreating={getMutationLoadingState(createMutation)}
      isUpdating={getMutationLoadingState(updateMutation)}
      isDeleting={getMutationLoadingState(deleteMutation)}
    />
  );
}
