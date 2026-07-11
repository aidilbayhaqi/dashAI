"use client";

export const FINANCE_CONFIRM_PAID_LABEL = "Konfirmasi Lunas";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ModulePage } from "@/components/modules/module-page";
import { CompanyScopeFilter } from "@/components/modules/company-scope-filter";
import {
  FeedbackToast,
  type FeedbackToastState,
} from "@/components/ui/feedback-toast";
import {
  createModuleRecord,
  deleteModuleRecord,
  updateModuleRecord,
} from "@/lib/module-crud";
import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import {
  ALL_COMPANIES_VALUE,
  useCompanyScope,
} from "@/lib/company-scope";
import {
  confirmSalesOrderPayment,
  getAutomationMonitoring,
} from "@/features/automation/api";
import type { AutomationMonitoringRow } from "@/features/automation/types";
import type { ModuleAction, ModuleRow } from "@/types/modules";

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

function extractError(error: unknown) {
  const candidate = error as {
    message?: string;
    response?: { data?: { detail?: unknown } };
  };
  const detail = candidate.response?.data?.detail;
  return typeof detail === "string"
    ? detail
    : candidate.message || "Aksi gagal diproses.";
}

export function FinanceModuleClient({
  moduleKey,
}: {
  moduleKey: FinanceModuleKey;
}) {
  const config = financeModuleConfig[moduleKey];
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompanyScope();
  const [toast, setToast] = useState<FeedbackToastState>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const { data, isLoading, isError } = useFinanceModule(moduleKey);

  const currentCompanyId = getCurrentCompanyId();
  const canShowCompanyFilter = isCurrentUserSuperAdmin() || !currentCompanyId;
  const effectiveCompanyId =
    currentCompanyId ||
    (selectedCompanyId !== ALL_COMPANIES_VALUE ? selectedCompanyId : null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const paymentMonitoringQuery = useQuery({
    queryKey: ["automation", "monitoring", effectiveCompanyId],
    queryFn: () => getAutomationMonitoring(effectiveCompanyId as string),
    enabled:
      Boolean(effectiveCompanyId) &&
      (moduleKey === "transactions" || moduleKey === "invoices"),
    refetchInterval: 15_000,
  });

  const monitoringRows = paymentMonitoringQuery.data ?? [];
  const monitoringByOrder = useMemo(() => {
    return new Map(
      monitoringRows.map((row) => [row.order_id, row] as const)
    );
  }, [monitoringRows]);

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

  const confirmPaymentMutation = useMutation({
    mutationFn: confirmSalesOrderPayment,
    onMutate: (variables) => setConfirmingOrderId(variables.orderId),
    onSuccess: async (result) => {
      setToast({
        type: "success",
        title: "Pembayaran berhasil dikonfirmasi",
        description: `${result.invoice_no ?? result.order_no} telah ditandai lunas.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
        queryClient.invalidateQueries({ queryKey: ["automation"] }),
      ]);
    },
    onError: (error) =>
      setToast({
        type: "error",
        title: "Konfirmasi pembayaran gagal",
        description: extractError(error),
      }),
    onSettled: () => setConfirmingOrderId(null),
  });

  function getRowActions(row: ModuleRow): ModuleAction[] {
    if (moduleKey !== "transactions" && moduleKey !== "invoices") return [];

    const sourceModule = String(row.source_module ?? "").toLowerCase();
    const orderId = String(row.source_id ?? "").trim();
    if (sourceModule !== "sales_order" || !orderId || !effectiveCompanyId) {
      return [];
    }

    const monitoring = monitoringByOrder.get(orderId);
    if (!monitoring || monitoring.payment_status === "paid") return [];

    return [
      {
        label: "Confirm Paid",
        icon: CheckCircle2,
        variant: "primary",
        disabled: confirmingOrderId === orderId,
        onClick: () =>
          confirmPaymentMutation.mutate({
            companyId: effectiveCompanyId,
            orderId,
          }),
      },
    ];
  }

  return (
    <>
      <FeedbackToast toast={toast} onClose={() => setToast(null)} />
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
        getRowActions={getRowActions}
        isCreating={getMutationLoadingState(createMutation)}
        isUpdating={getMutationLoadingState(updateMutation)}
        isDeleting={getMutationLoadingState(deleteMutation)}
      />
    </>
  );
}

