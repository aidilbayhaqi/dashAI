"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, CheckCircle2 } from "lucide-react";

import { CompanyScopeFilter } from "@/components/modules/company-scope-filter";
import { ModulePage } from "@/components/modules/module-page";
import {
  createModuleRecord,
  deleteModuleRecord,
  updateModuleRecord,
} from "@/lib/module-crud";
import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import type { ModuleAction, ModuleRow } from "@/types/modules";

import {
  closeCRMDealWon,
  confirmCRMDealPayment,
} from "./api";
import { crmModuleConfig } from "./config";
import { useCRMModule } from "./hook";
import type { CRMModuleKey } from "./types";
import { normalizeCRMModuleKey } from "./types";

type MutationState = {
  isPending?: boolean;
  isLoading?: boolean;
};

function getMutationLoadingState(mutation: MutationState) {
  return mutation.isPending ?? mutation.isLoading ?? false;
}

export function CRMModuleClient({
  moduleKey,
}: {
  moduleKey: CRMModuleKey | string;
}) {
  const safeModuleKey = normalizeCRMModuleKey(String(moduleKey));
  const config = crmModuleConfig[safeModuleKey];

  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useCRMModule(safeModuleKey);

  const currentCompanyId = getCurrentCompanyId();
  const canShowCompanyFilter = isCurrentUserSuperAdmin() || !currentCompanyId;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["crm"],
    });
  }

  const createMutation = useMutation({
    mutationFn: (payload: ModuleRow) =>
      createModuleRecord({
        featureKey: "crm",
        moduleKey: safeModuleKey,
        payload,
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModuleRow }) =>
      updateModuleRecord({
        featureKey: "crm",
        moduleKey: safeModuleKey,
        id,
        payload,
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteModuleRecord({
        featureKey: "crm",
        moduleKey: safeModuleKey,
        id,
      }),
    onSuccess: invalidate,
  });

  const closeWonMutation = useMutation({
    mutationFn: closeCRMDealWon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["automation"] });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: confirmCRMDealPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["automation"] });
    },
  });

  function getRowActions(row: ModuleRow): ModuleAction[] {
    if (safeModuleKey !== "deals" || !row.id) return [];

    const stage = String(row.stage ?? "").toLowerCase();
    const actions: ModuleAction[] = [];

    if (stage !== "won" && stage !== "lost") {
      actions.push({
        label: "Close Won",
        icon: CheckCircle2,
        variant: "primary",
        disabled: closeWonMutation.isPending,
        onClick: async () => {
          await closeWonMutation.mutateAsync(String(row.id));
        },
      });
    }

    if (stage === "won" && row.finance_transaction_id) {
      actions.push({
        label: "Confirm Payment",
        icon: BadgeDollarSign,
        variant: "primary",
        disabled: confirmPaymentMutation.isPending,
        onClick: async () => {
          await confirmPaymentMutation.mutateAsync(String(row.id));
        },
      });
    }

    return actions;
  }

  if (!config) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        CRM module tidak ditemukan: {String(moduleKey)}
      </div>
    );
  }

  return (
    <ModulePage
      {...config}
      moduleKey={safeModuleKey}
      metrics={data?.metrics ?? []}
      rows={data?.rows ?? []}
      aiNotes={data?.aiNotes ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada data CRM."
      topContent={canShowCompanyFilter ? <CompanyScopeFilter /> : null}
      onImportRecords={async (rows) => {
        for (const payload of rows) {
          await createMutation.mutateAsync(payload);
        }
      }}
      onCreateRecord={(payload) => createMutation.mutateAsync(payload)}
      onUpdateRecord={(id, payload) =>
        updateMutation.mutateAsync({
          id,
          payload,
        })
      }
      onDeleteRecord={(id) => deleteMutation.mutateAsync(id)}
      getRowActions={getRowActions}
      isCreating={getMutationLoadingState(createMutation)}
      isUpdating={getMutationLoadingState(updateMutation)}
      isDeleting={getMutationLoadingState(deleteMutation)}
    />
  );
}