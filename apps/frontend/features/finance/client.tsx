"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ModulePage } from "@/components/modules/module-page";
import { CompanyScopeFilter } from "@/components/modules/company-scope-filter";
import {
  createModuleRecord,
  deleteModuleRecord,
  updateModuleRecord,
} from "@/lib/module-crud";
import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import type { ModuleRow } from "@/types/modules";

import { financeModuleConfig } from "./config";
import { useFinanceModule } from "./hook";
import type { FinanceModuleKey } from "./types";

type MutationState = {
  isPending?: boolean;
  isLoading?: boolean;
};

function getMutationLoadingState(mutation: MutationState) {
  return mutation.isPending ?? mutation.isLoading ?? false;
}

export function FinanceModuleClient({
  moduleKey,
}: {
  moduleKey: FinanceModuleKey;
}) {
  const config = financeModuleConfig[moduleKey];
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useFinanceModule(moduleKey);

  /**
   * Superadmin:
   * - tampilkan filter company
   *
   * Owner/admin/staff:
   * - filter company hilang
   *
   * Fallback !currentCompanyId dipakai karena sebelumnya
   * isCurrentUserSuperAdmin() kadang kebaca false di akun superadmin.
   */
  const currentCompanyId = getCurrentCompanyId();
  const canShowCompanyFilter = isCurrentUserSuperAdmin() || !currentCompanyId;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["finance"],
    });
  }

  const createMutation = useMutation({
    mutationFn: (payload: ModuleRow) =>
      createModuleRecord({
        featureKey: "finance",
        moduleKey,
        payload,
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModuleRow }) =>
      updateModuleRecord({
        featureKey: "finance",
        moduleKey,
        id,
        payload,
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteModuleRecord({
        featureKey: "finance",
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
      emptyMessage="Belum ada data finance."
      topContent={canShowCompanyFilter ? <CompanyScopeFilter /> : null}
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