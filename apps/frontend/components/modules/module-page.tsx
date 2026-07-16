"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  ListFilter,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";

import type {
  ModuleAction,
  ModuleConfig,
  ModuleData,
  ModuleRow,
} from "@/types/modules";

import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { parseLocalizedNumber } from "@/lib/number";
import {
  exportFinancialReportToPDF,
  exportInvoiceToPDF,
  exportRowsToExcel,
  exportRowsToPDF,
} from "@/lib/export";

import { ModuleDeleteDialog } from "./module-delete-dialog";
import { ModuleDetailDialog } from "./module-detail-dialog";
import { ModuleEmpty } from "./module-empty";
import { ModuleError } from "./module-error";
import { ModuleLoading } from "./module-loading";
import { ModuleMetricCard } from "./module-metric-card";
import { ModuleFilterSelect } from "./module-filter-select";
import { RecordModal } from "./record-modal";
import { ModuleTable, makeModuleRowKey } from "./module-table";

import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import type {
  ImportBatchFailure,
  ImportBatchResult,
} from "@/lib/import-batch";

type ModulePageProps = ModuleConfig &
  Partial<ModuleData> & {
    isLoading?: boolean;
    isError?: boolean;
    emptyMessage?: string;
    actions?: ModuleAction[];
    moduleKey?: string;
    topContent?: ReactNode;

    onCreateRecord?: (row: ModuleRow) => Promise<void> | void;
    onImportRecords?: (rows: ModuleRow[]) => Promise<ImportBatchResult | void> | ImportBatchResult | void;
    onUpdateRecord?: (id: string, row: ModuleRow) => Promise<void> | void;
    onDeleteRecord?: (id: string) => Promise<void> | void;
    getRowActions?: (row: ModuleRow) => ModuleAction[];

    isCreating?: boolean;
    isUpdating?: boolean;
    isDeleting?: boolean;
  };

function getStatusDisplayValue(row: ModuleRow) {
  const preferredKeys = [
    "payment_status",
    "invoice_status",
    "transaction_status",
    "stock_status",
    "approval_status",
    "employment_status",
    "is_paid_label",
    "is_active_label",
    "status_label",
    "status",
  ];

  for (const key of preferredKeys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }

  const statusEntry = Object.entries(row).find(([key]) =>
    key.toLowerCase().includes("status")
  );

  return String(statusEntry?.[1] ?? "").trim();
}

function getRowDateValue(row: ModuleRow, preferredKey: string) {
  const candidates = [
    row[preferredKey],
    row.updated_at,
    row.created_at,
    row.transaction_date,
    row.invoice_date,
    row.order_date,
    row.report_date,
  ];

  for (const candidate of candidates) {
    const parsed = new Date(String(candidate ?? "")).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

function getRowTitleValue(row: ModuleRow) {
  const candidates = [
    row.name,
    row.title,
    row.full_name,
    row.product_name,
    row.employee_name,
    row.client_name,
    row.company_name,
    row.order_no,
    row.invoice_no,
    row.transaction_no,
    row.sku,
    row.code,
    row.email,
  ];

  return String(candidates.find((value) => String(value ?? "").trim()) ?? "")
    .trim()
    .toLowerCase();
}

function getRowAmountValue(row: ModuleRow) {
  const candidates = [
    row.total_amount,
    row.amount,
    row.total,
    row.paid_amount,
    row.selling_price,
    row.cost_price,
  ];

  for (const candidate of candidates) {
    const parsed = parseLocalizedNumber(candidate);
    if (parsed !== undefined) return parsed;
  }

  return 0;
}


export function ModulePage({
  badge,
  title,
  description,
  icon: Icon,
  columns,
  formFields,
  detailFields,
  metrics = [],
  rows = [],
  isLoading,
  isError,
  emptyMessage = "Belum ada data.",
  moduleKey,
  topContent,
  onCreateRecord,
  onImportRecords,
  onUpdateRecord,
  onDeleteRecord,
  getRowActions,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
  tableTitle = "Data Records",
  tableDescription = "Kelola data module, import Excel, export Excel/PDF, dan lakukan aksi data secara cepat.",
}: ModulePageProps) {
  const [localRows, setLocalRows] = useState<ModuleRow[]>([]);
  const [importState, setImportState] = useState<{
    status: "idle" | "loading" | "success" | "warning" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [importFailures, setImportFailures] = useState<ImportBatchFailure[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("updated_desc");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ModuleRow | null>(null);
  const [detailRow, setDetailRow] = useState<ModuleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    row: ModuleRow;
    rowIndex: number;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const currentCompanyId = getCurrentCompanyId();
  const canShowCompanyFilter = isCurrentUserSuperAdmin() || !currentCompanyId;

  const baseRows = useMemo(() => {
    return Array.isArray(rows) ? rows : [];
  }, [rows]);

  const tableRows = useMemo(() => {
    const rowMap = new Map<string, ModuleRow>();

    [...baseRows, ...localRows].forEach((row, index) => {
      const key = makeModuleRowKey(row, index);
      rowMap.set(String(key), row);
    });

    return Array.from(rowMap.values());
  }, [baseRows, localRows]);

  const normalizedTitle = `${title} ${moduleKey ?? ""}`.toLowerCase();

  const isInvoice = normalizedTitle.includes("invoice");

  const isFinanceReport =
    normalizedTitle.includes("finance") ||
    normalizedTitle.includes("tax") ||
    normalizedTitle.includes("ledger") ||
    normalizedTitle.includes("cashflow") ||
    normalizedTitle.includes("report");

  const statusOptions = useMemo(() => {
    const index = new Map<string, { label: string; count: number }>();

    tableRows.forEach((row) => {
      const label = getStatusDisplayValue(row);
      if (!label) return;

      const key = label.toLowerCase();
      const current = index.get(key);
      index.set(key, {
        label,
        count: (current?.count ?? 0) + 1,
      });
    });

    return Array.from(index.entries())
      .map(([value, item]) => ({ value, ...item }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [tableRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const result = tableRows.filter((row) => {
      const rowText = Object.entries(row)
        .filter(([key]) => key !== "id" && !key.endsWith("_id"))
        .map(([, value]) => String(value ?? ""))
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !normalizedSearch || rowText.includes(normalizedSearch);
      const rowStatus = getStatusDisplayValue(row).toLowerCase();
      const matchesStatus =
        statusFilter === "all" || rowStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((left, right) => {
      if (sortMode === "updated_asc") {
        return getRowDateValue(left, "updated_at") - getRowDateValue(right, "updated_at");
      }
      if (sortMode === "created_desc") {
        return getRowDateValue(right, "created_at") - getRowDateValue(left, "created_at");
      }
      if (sortMode === "created_asc") {
        return getRowDateValue(left, "created_at") - getRowDateValue(right, "created_at");
      }
      if (sortMode === "name_asc") {
        return getRowTitleValue(left).localeCompare(getRowTitleValue(right));
      }
      if (sortMode === "name_desc") {
        return getRowTitleValue(right).localeCompare(getRowTitleValue(left));
      }
      if (sortMode === "amount_desc") {
        return getRowAmountValue(right) - getRowAmountValue(left);
      }
      if (sortMode === "amount_asc") {
        return getRowAmountValue(left) - getRowAmountValue(right);
      }

      return getRowDateValue(right, "updated_at") - getRowDateValue(left, "updated_at");
    });
  }, [search, sortMode, statusFilter, tableRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  const paginationStart =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, filteredRows.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [moduleKey, pageSize, search, sortMode, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const canCreateRecord = Boolean(onCreateRecord);
  const canUpdateRecord = Boolean(onUpdateRecord);
  const canDeleteRecord = Boolean(onDeleteRecord);

  function openCreateModal() {
    setEditingRow(null);
    setRecordModalOpen(true);
  }

  function openEditModal(row: ModuleRow) {
    setEditingRow(row);
    setRecordModalOpen(true);
  }

  function closeRecordModal() {
    setEditingRow(null);
    setRecordModalOpen(false);
  }

  async function handleSubmitRecord(row: ModuleRow) {
    if (editingRow) {
      const id = editingRow.id;

      if (onUpdateRecord) {
        if (!id) {
          window.alert("Data ini tidak punya ID, jadi tidak bisa update ke backend.");
          return;
        }

        await onUpdateRecord(id, row);
        closeRecordModal();
        return;
      }

      const editingKey = makeModuleRowKey(editingRow, 0);

      setLocalRows((current) =>
        current.map((item) =>
          makeModuleRowKey(item, 0) === editingKey ? { ...item, ...row } : item
        )
      );

      closeRecordModal();
      return;
    }

    if (onCreateRecord) {
      await onCreateRecord(row);
      closeRecordModal();
      return;
    }

    setLocalRows((current) => [{ ...row, id: crypto.randomUUID() }, ...current]);
    closeRecordModal();
  }

  function requestDeleteRecord(row: ModuleRow, rowIndex: number) {
    setDeleteError(null);
    setDeleteTarget({
      row,
      rowIndex,
    });
  }

  async function confirmDeleteRecord() {
    if (!deleteTarget) return;

    const { row, rowIndex } = deleteTarget;

    try {
      setDeleteError(null);

      if (onDeleteRecord) {
        if (!row.id) {
          setDeleteError(
            "Data ini tidak memiliki ID sehingga tidak dapat dihapus dari backend."
          );
          return;
        }

        await onDeleteRecord(row.id);
        setDeleteTarget(null);
        return;
      }

      const rowKey = makeModuleRowKey(row, rowIndex);

      setLocalRows((current) =>
        current.filter((item, index) => makeModuleRowKey(item, index) !== rowKey)
      );
      setDeleteTarget(null);
    } catch (error: unknown) {
      setDeleteError(
        getApiErrorMessage(
          error,
          "Data gagal dihapus. Periksa relasi data dan coba lagi.",
        ),
      );
    }
  }

  function handleImportExcel(file: File | null) {
    if (!file) return;

    setImportFailures([]);
    setImportState({
      status: "loading",
      message: `Membaca ${file.name}...`,
    });

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) throw new Error("File tidak dapat dibaca.");

        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error("Worksheet tidak ditemukan.");

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          { defval: "" },
        );
        if (jsonRows.length === 0) {
          throw new Error("File tidak memiliki baris data.");
        }

        const importFields = [
          ...(formFields ?? []).map((field) => ({
            key: field.key,
            label: field.label,
          })),
          ...columns.map((column) => ({
            key: column.key,
            label: column.label,
          })),
        ].filter(
          (field, index, all) =>
            field.key !== "id" &&
            all.findIndex((candidate) => candidate.key === field.key) === index,
        );

        const importedRows: ModuleRow[] = jsonRows.map((item) => {
          const normalizedHeaders = new Map(
            Object.entries(item).map(([key, value]) => [
              key.trim().toLowerCase(),
              value,
            ]),
          );
          const row: ModuleRow = {};

          importFields.forEach((field) => {
            const value =
              item[field.key] ??
              item[field.label] ??
              normalizedHeaders.get(field.key.trim().toLowerCase()) ??
              normalizedHeaders.get(field.label.trim().toLowerCase());

            if (value !== undefined && value !== null && value !== "") {
              row[field.key] = value;
            }
          });

          return row;
        });

        const validRows = importedRows.filter(
          (row) => Object.keys(row).length > 0,
        );
        if (validRows.length === 0) {
          throw new Error(
            "Header Excel tidak cocok dengan field module. Gunakan nama key atau label yang tampil pada form.",
          );
        }

        let result: ImportBatchResult = {
          successCount: validRows.length,
          failures: [],
        };

        if (onImportRecords) {
          result = (await onImportRecords(validRows)) ?? result;
        } else if (onCreateRecord) {
          const failures: ImportBatchFailure[] = [];
          let successCount = 0;
          for (const [index, row] of validRows.entries()) {
            try {
              await onCreateRecord(row);
              successCount += 1;
            } catch (error: unknown) {
              failures.push({
                rowNumber: index + 2,
                row,
                message: getApiErrorMessage(
                  error,
                  "Baris gagal diproses oleh backend.",
                ),
              });
            }
          }
          result = { successCount, failures };
        } else {
          setLocalRows((current) => [
            ...validRows.map((row) => ({
              ...row,
              id: crypto.randomUUID(),
            })),
            ...current,
          ]);
        }

        setImportFailures(result.failures);
        setImportState({
          status: result.failures.length > 0 ? "warning" : "success",
          message:
            result.failures.length > 0
              ? `${result.successCount} baris berhasil, ${result.failures.length} baris gagal. Unduh laporan gagal untuk koreksi.`
              : `${result.successCount} baris berhasil diimpor dan diproses melalui workflow module.`,
        });
      } catch (error) {
        setImportState({
          status: "error",
          message: getApiErrorMessage(
            error,
            "Import gagal. Periksa header, field wajib, dan format data.",
          ),
        });
      }
    };

    reader.onerror = () =>
      setImportState({
        status: "error",
        message: "File gagal dibaca oleh browser.",
      });

    reader.readAsArrayBuffer(file);
  }

  function handleExportImportFailures() {
    if (importFailures.length === 0) return;

    const failureRows = importFailures.map((failure) => ({
      row_number: failure.rowNumber,
      error: failure.message,
      ...failure.row,
    }));
    const worksheet = XLSX.utils.json_to_sheet(failureRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Failed Rows");
    XLSX.writeFile(workbook, `${title} Import Failures.xlsx`);
  }

  function handleExportExcel() {
    exportRowsToExcel({
      filename: `${title} Data`,
      sheetName: title.slice(0, 30),
      columns,
      rows: filteredRows,
    });
  }

  function handleExportPDF() {
    exportRowsToPDF({
      filename: `${title} Data`,
      title,
      description,
      columns,
      rows: filteredRows,
    });
  }

  function handleExportReport() {
    exportFinancialReportToPDF({
      title,
      columns,
      rows: filteredRows,
    });
  }

  function handleExportInvoice() {
    const firstInvoice = filteredRows[0];

    if (!firstInvoice) {
      window.alert("Belum ada data invoice untuk diexport.");
      return;
    }

    exportInvoiceToPDF(firstInvoice);
  }

  if (isLoading) return <ModuleLoading />;
  if (isError) return <ModuleError />;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
        <div className="border-b border-slate-200/80 bg-slate-50/70 px-6 py-5 dark:border-slate-900 dark:bg-[#02040a]/70">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-500">
                {badge}
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f2a5f] text-white shadow-lg shadow-blue-950/10 dark:bg-blue-700">
                  {Icon ? <Icon size={24} /> : <FileText size={24} />}
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    {title}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-500">
                    {description}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-400">
              {filteredRows.length} of {tableRows.length} records
            </div>
          </div>
        </div>

        {metrics.length > 0 ? (
          <div className="p-6">
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {metrics.map((metric) => (
                <ModuleMetricCard key={metric.label} metric={metric} />
              ))}
            </section>
          </div>
        ) : null}
      </section>

      {topContent && canShowCompanyFilter ? <section>{topContent}</section> : null}

      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
        <div className="mb-5 flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {tableTitle}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
              {tableDescription}
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]">
                {importState.status === "loading" ? (
                  <RotateCcw size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {importState.status === "loading" ? "Importing..." : "Import Excel"}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  disabled={importState.status === "loading"}
                  className="hidden"
                  onChange={(event) =>
                    handleImportExcel(event.target.files?.[0] ?? null)
                  }
                />
              </label>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]"
              >
                <FileSpreadsheet size={16} />
                Export Excel
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]"
              >
                <FileText size={16} />
                Export PDF
              </button>

              {isInvoice ? (
                <button
                  type="button"
                  onClick={handleExportInvoice}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0f2a5f] px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Download size={16} />
                  Export Invoice
                </button>
              ) : null}

              {isFinanceReport ? (
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0f2a5f] px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Download size={16} />
                  Export Report
                </button>
              ) : null}
            </div>

            {importState.message ? (
              <div
                className={cn(
                  "rounded-2xl border px-4 py-2 text-xs font-bold",
                  importState.status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300"
                    : importState.status === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                      : importState.status === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300"
                        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-950 dark:bg-blue-950/20 dark:text-blue-300",
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span>{importState.message}</span>
                  {importFailures.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleExportImportFailures}
                      className="rounded-xl border border-current/20 px-3 py-1 font-black transition hover:bg-white/50 dark:hover:bg-black/20"
                    >
                      Download Failed Rows
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {canCreateRecord ? (
              <button
                type="button"
                onClick={openCreateModal}
                disabled={isCreating || isUpdating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-[#0f2a5f] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100"
              >
                <Plus size={16} />
                {isCreating ? "Saving..." : "New Record"}
              </button>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-900 dark:bg-[#02040a]/70">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
              <div className="flex h-11 items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 px-4 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/60 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-950 dark:focus-within:border-indigo-800 dark:focus-within:ring-indigo-950/60">
                <Search size={17} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari data, nomor, nama, atau deskripsi..."
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />
              </div>

              <ModuleFilterSelect
                ariaLabel="Filter status"
                icon={<ListFilter size={16} />}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  {
                    value: "all",
                    label: `Semua status (${tableRows.length})`,
                  },
                  ...statusOptions.map((option) => ({
                    value: option.value,
                    label: `${option.label} (${option.count})`,
                  })),
                ]}
              />

              <ModuleFilterSelect
                ariaLabel="Urutkan data"
                icon={<ArrowUpDown size={16} />}
                value={sortMode}
                onChange={setSortMode}
                options={[
                  { value: "updated_desc", label: "Terbaru diperbarui" },
                  { value: "updated_asc", label: "Terlama diperbarui" },
                  { value: "created_desc", label: "Terbaru dibuat" },
                  { value: "created_asc", label: "Terlama dibuat" },
                  { value: "name_asc", label: "Nama A-Z" },
                  { value: "name_desc", label: "Nama Z-A" },
                  { value: "amount_desc", label: "Nominal terbesar" },
                  { value: "amount_asc", label: "Nominal terkecil" },
                ]}
              />

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setSortMode("updated_desc");
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-100 via-indigo-50 to-blue-50 px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-950 dark:text-slate-300 dark:hover:border-indigo-900"
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>

            {statusOptions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {statusOptions.slice(0, 8).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black transition",
                      statusFilter === option.value
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-[#050816] dark:text-slate-300"
                    )}
                  >
                    {option.label}
                    <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <ModuleEmpty message={emptyMessage} />
        ) : (
          <ModuleTable
            title={title}
            columns={columns}
            rows={paginatedRows}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRows.length}
            startItem={paginationStart}
            endItem={paginationEnd}
            isInvoice={isInvoice}
            canUpdate={canUpdateRecord}
            canDelete={canDeleteRecord}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            getRowActions={getRowActions}
            onDetail={setDetailRow}
            onEdit={openEditModal}
            onDelete={requestDeleteRecord}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>

      <RecordModal
        open={recordModalOpen}
        title={title}
        mode={editingRow ? "edit" : "create"}
        moduleKey={moduleKey}
        columns={columns}
        fields={formFields}
        initialRow={editingRow}
        isSubmitting={isCreating || isUpdating}
        onClose={closeRecordModal}
        onSubmit={handleSubmitRecord}
      />

      <ModuleDetailDialog
        open={Boolean(detailRow)}
        title={title}
        row={detailRow}
        fields={detailFields}
        columns={columns}
        onClose={() => setDetailRow(null)}
        onEdit={
          canUpdateRecord
            ? (row) => {
                setDetailRow(null);
                openEditModal(row);
              }
            : undefined
        }
      />

      <ModuleDeleteDialog
        open={Boolean(deleteTarget)}
        moduleTitle={title}
        row={deleteTarget?.row ?? null}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDeleteRecord}
      />
    </div>
  );
}