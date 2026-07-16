"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Calculator, ExternalLink } from "lucide-react";

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

import { hrModuleConfig } from "./config";
import { useHRModule } from "./hook";
import {
  calculatePayrollRun,
  createPayrollRun,
  updatePayrollRun,
} from "./payroll-service";
import {
  normalizeHRModuleKey,
  type HRModuleKey,
} from "./types";

type MutationState = {
  isPending?: boolean;
  isLoading?: boolean;
};

function getMutationLoadingState(
  mutation: MutationState
) {
  return (
    mutation.isPending ??
    mutation.isLoading ??
    false
  );
}

export function HRModuleClient({
  moduleKey,
}: {
  moduleKey: HRModuleKey | string;
}) {
  const safeModuleKey = normalizeHRModuleKey(
    String(moduleKey)
  );

  const config = hrModuleConfig[safeModuleKey];
  const isPayrollModule =
    safeModuleKey === "payroll-runs";

  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
  } = useHRModule(safeModuleKey);

  const currentCompanyId =
    getCurrentCompanyId();

  const canShowCompanyFilter =
    isCurrentUserSuperAdmin() ||
    !currentCompanyId;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["hr"],
    });
  }

  const createMutation = useMutation({
    mutationFn: (payload: ModuleRow) => {
      if (isPayrollModule) {
        return createPayrollRun(payload);
      }

      return createModuleRecord({
        featureKey: "hr",
        moduleKey: safeModuleKey,
        payload,
      });
    },

    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ModuleRow;
    }) => {
      if (isPayrollModule) {
        return updatePayrollRun(
          id,
          payload
        );
      }

      return updateModuleRecord({
        featureKey: "hr",
        moduleKey: safeModuleKey,
        id,
        payload,
      });
    },

    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteModuleRecord({
        featureKey: "hr",
        moduleKey: safeModuleKey,
        id,
      }),

    onSuccess: invalidate,
  });

  const calculatePayrollMutation = useMutation({
    mutationFn: calculatePayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["automation"] });
    },
  });

  function getRowActions(row: ModuleRow): ModuleAction[] {
    if (!isPayrollModule || !row.id) return [];

    const status = String(row.status ?? "").toLowerCase();
    const actions: ModuleAction[] = [];

    if (status === "draft") {
      actions.push({
        label: "Calculate Payroll",
        icon: Calculator,
        variant: "primary",
        disabled: calculatePayrollMutation.isPending,
        onClick: async () => {
          await calculatePayrollMutation.mutateAsync(String(row.id));
        },
      });
    }

    if (row.finance_transaction_id) {
      actions.push({
        label: "Open Finance",
        icon: ExternalLink,
        href: "/finance/transactions",
        variant: "secondary",
      });
    }

    return actions;
  }

  if (!config) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        HR module tidak ditemukan:{" "}
        {String(moduleKey)}
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
      emptyMessage="Belum ada data HR."
      topContent={
        canShowCompanyFilter ? (
          <CompanyScopeFilter />
        ) : null
      }
      onImportRecords={async (rows) => {
        for (const payload of rows) {
          await createMutation.mutateAsync(payload);
        }
      }}
      onCreateRecord={(payload) =>
        createMutation.mutateAsync(payload)
      }
      onUpdateRecord={(id, payload) =>
        updateMutation.mutateAsync({
          id,
          payload,
        })
      }
      onDeleteRecord={(id) =>
        deleteMutation.mutateAsync(id)
      }
      getRowActions={getRowActions}
      isCreating={getMutationLoadingState(
        createMutation
      )}
      isUpdating={getMutationLoadingState(
        updateMutation
      )}
      isDeleting={getMutationLoadingState(
        deleteMutation
      )}
    />
  );
}