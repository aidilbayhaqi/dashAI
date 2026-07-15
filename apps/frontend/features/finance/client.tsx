"use client";

export const FINANCE_CONFIRM_PAID_LABEL = "Konfirmasi Lunas";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
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
  hasCurrentUserPermission,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import {
  ALL_COMPANIES_VALUE,
  useCompanyScope,
} from "@/lib/company-scope";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  confirmSalesOrderPayment,
  getAutomationMonitoring,
} from "@/features/automation/api";
import type { ModuleAction, ModuleRow } from "@/types/modules";

import {
  accrueTaxRecord,
  cancelInvoice,
  cancelTaxRecord,
  cancelTransaction,
  generateCashflow,
  payInvoice,
  payTaxRecord,
  postJournal,
  postTransaction,
  reportTaxRecord,
  reverseJournal,
  sendInvoice,
  voidTransaction,
} from "./commands";
import { financeModuleConfig } from "./config";
import { useFinanceModule } from "./hook";
import type { FinanceModuleKey } from "./types";

type MutationState = {
  isPending?: boolean;
  isLoading?: boolean;
};

type FinanceCommand = {
  rowId: string;
  label: string;
  execute: () => Promise<ModuleRow>;
};

function getMutationLoadingState(mutation: MutationState) {
  return mutation.isPending ?? mutation.isLoading ?? false;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
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
  const [runningCommandId, setRunningCommandId] = useState<string | null>(null);

  const { data, isLoading, isError } = useFinanceModule(moduleKey);
  const currentCompanyId = getCurrentCompanyId();
  const canShowCompanyFilter = isCurrentUserSuperAdmin() || !currentCompanyId;
  const effectiveCompanyId =
    currentCompanyId ||
    (selectedCompanyId !== ALL_COMPANIES_VALUE ? selectedCompanyId : null);
  const canApproveTransactions = hasCurrentUserPermission("finance.transactions.approve");
  const canApproveInvoices = hasCurrentUserPermission("finance.invoices.approve");
  const canApproveJournals = hasCurrentUserPermission("finance.journals.approve");
  const canApproveTaxes = hasCurrentUserPermission("finance.tax-rates.approve");
  const canGenerateSnapshots = hasCurrentUserPermission("finance.snapshots.approve");

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
  const monitoringRows = useMemo(
    () => paymentMonitoringQuery.data ?? [],
    [paymentMonitoringQuery.data],
  );
  const monitoringByOrder = useMemo(
    () => new Map(monitoringRows.map((row) => [row.order_id, row] as const)),
    [monitoringRows],
  );

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["finance"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-report"] }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (payload: ModuleRow) => {
      if (moduleKey === "cashflow") {
        if (!effectiveCompanyId || !canGenerateSnapshots) {
          throw new Error("Anda tidak memiliki izin membuat snapshot cashflow.");
        }
        return generateCashflow(payload, effectiveCompanyId);
      }
      return createModuleRecord({ featureKey: "finance", moduleKey, payload });
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModuleRow }) =>
      updateModuleRecord({ featureKey: "finance", moduleKey, id, payload }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteModuleRecord({ featureKey: "finance", moduleKey, id }),
    onSuccess: invalidate,
  });

  const commandMutation = useMutation({
    mutationFn: async (command: FinanceCommand) => {
      setRunningCommandId(`${command.rowId}:${command.label}`);
      return command.execute();
    },
    onSuccess: async (_result, command) => {
      setToast({
        type: "success",
        title: `${command.label} berhasil`,
        description: "Workflow finance diproses secara atomic dan audit-safe.",
      });
      await invalidate();
    },
    onError: (error, command) =>
      setToast({
        type: "error",
        title: `${command.label} gagal`,
        description: getApiErrorMessage(error, "Workflow finance gagal diproses."),
      }),
    onSettled: () => setRunningCommandId(null),
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
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ["automation"] }),
      ]);
    },
    onError: (error) =>
      setToast({
        type: "error",
        title: "Konfirmasi pembayaran gagal",
        description: getApiErrorMessage(error),
      }),
    onSettled: () => setConfirmingOrderId(null),
  });

  function runCommand(command: FinanceCommand, confirmation: string) {
    if (!window.confirm(confirmation)) return;
    commandMutation.mutate(command);
  }

  function commandAction(
    rowId: string,
    label: string,
    icon: ModuleAction["icon"],
    execute: () => Promise<ModuleRow>,
    confirmation: string,
    variant: ModuleAction["variant"] = "secondary",
  ): ModuleAction {
    return {
      label,
      icon,
      variant,
      disabled: commandMutation.isPending,
      onClick: () => runCommand({ rowId, label, execute }, confirmation),
    };
  }

  function getRowActions(row: ModuleRow): ModuleAction[] {
    const rowId = String(row.id ?? "");
    if (!rowId || !effectiveCompanyId) return [];
    const status = normalizeStatus(row.status ?? row.status_label);
    const sourceModule = String(row.source_module ?? "").toLowerCase();
    const isSalesOrderSource = sourceModule === "sales_order";
    const actions: ModuleAction[] = [];

    if (moduleKey === "transactions" && canApproveTransactions) {
      if (status === "draft") {
        actions.push(
          commandAction(rowId, "Post Transaction", ShieldCheck, () => postTransaction(rowId, effectiveCompanyId), "Posting transaksi akan mengunci nominal dan memperbarui saldo cash account. Lanjutkan?", "primary"),
          commandAction(rowId, "Cancel", Ban, () => cancelTransaction(rowId, effectiveCompanyId), "Batalkan transaksi draft ini?", "danger"),
        );
      } else if (status === "posted") {
        actions.push(commandAction(rowId, "Void Transaction", RotateCcw, () => voidTransaction(rowId, effectiveCompanyId), "Void transaksi akan membalik dampak saldo. Lanjutkan?", "danger"));
      }
    }

    if (moduleKey === "invoices" && canApproveInvoices) {
      if (status === "draft") {
        actions.push(
          commandAction(rowId, "Send Invoice", Send, () => sendInvoice(rowId, effectiveCompanyId), "Kirim dan kunci invoice draft ini?", "primary"),
          commandAction(rowId, "Cancel", Ban, () => cancelInvoice(rowId, effectiveCompanyId), "Batalkan invoice ini?", "danger"),
        );
      } else if (
        !isSalesOrderSource &&
        ["sent", "partially_paid", "overdue"].includes(status)
      ) {
        actions.push(commandAction(rowId, FINANCE_CONFIRM_PAID_LABEL, CircleDollarSign, () => payInvoice(rowId, effectiveCompanyId), "Catat seluruh outstanding invoice sebagai lunas?", "primary"));
      }
    }

    if (moduleKey === "taxes" && canApproveTaxes) {
      if (status === "draft") {
        actions.push(
          commandAction(rowId, "Accrue Tax", ShieldCheck, () => accrueTaxRecord(rowId, effectiveCompanyId), "Akui kewajiban pajak ini dan kunci nilai pajaknya?", "primary"),
          commandAction(rowId, "Cancel", Ban, () => cancelTaxRecord(rowId, effectiveCompanyId), "Batalkan tax record ini?", "danger"),
        );
      } else if (status === "accrued") {
        actions.push(
          commandAction(rowId, "Pay Tax", CircleDollarSign, () => payTaxRecord(rowId, effectiveCompanyId), "Catat pembayaran penuh kewajiban pajak ini?", "primary"),
          commandAction(rowId, "Cancel", Ban, () => cancelTaxRecord(rowId, effectiveCompanyId), "Batalkan tax record accrued ini?", "danger"),
        );
      } else if (status === "paid") {
        actions.push(commandAction(rowId, "Mark Reported", CheckCircle2, () => reportTaxRecord(rowId, effectiveCompanyId), "Tandai pajak ini sudah dilaporkan?", "primary"));
      }
    }

    if (moduleKey === "ledger" && canApproveJournals) {
      if (status === "draft") {
        actions.push(commandAction(rowId, "Post Journal", ShieldCheck, () => postJournal(rowId, effectiveCompanyId), "Posting jurnal akan mengunci seluruh line. Lanjutkan?", "primary"));
      } else if (status === "posted") {
        actions.push(commandAction(rowId, "Reverse Journal", RotateCcw, () => reverseJournal(rowId, effectiveCompanyId), "Reverse jurnal yang sudah posted?", "danger"));
      }
    }

    if (moduleKey === "transactions" || moduleKey === "invoices") {
      const orderId = String(row.source_id ?? "").trim();
      const monitoring = monitoringByOrder.get(orderId);
      if (
        sourceModule === "sales_order" &&
        orderId &&
        monitoring &&
        monitoring.payment_status !== "paid" &&
        canApproveInvoices
      ) {
        actions.push({
          label: "Confirm Sales Paid",
          icon: CheckCircle2,
          variant: "primary",
          disabled: confirmingOrderId === orderId,
          onClick: () =>
            confirmPaymentMutation.mutate({
              companyId: effectiveCompanyId,
              orderId,
            }),
        });
      }
    }

    return actions;
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
        onCreateRecord={
          moduleKey === "cashflow" && !canGenerateSnapshots
            ? undefined
            : (payload) => createMutation.mutateAsync(payload)
        }
        onUpdateRecord={
          moduleKey === "cashflow"
            ? undefined
            : (id, payload) => updateMutation.mutateAsync({ id, payload })
        }
        onDeleteRecord={
          moduleKey === "cashflow"
            ? undefined
            : (id) => deleteMutation.mutateAsync(id)
        }
        getRowActions={getRowActions}
        isCreating={getMutationLoadingState(createMutation)}
        isUpdating={getMutationLoadingState(updateMutation)}
        isDeleting={getMutationLoadingState(deleteMutation) || Boolean(runningCommandId)}
      />
    </>
  );
}
