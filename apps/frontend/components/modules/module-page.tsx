"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import type {
  ModuleAction,
  ModuleColumn,
  ModuleConfig,
  ModuleData,
  ModuleField,
  ModuleMetric,
  ModuleRow,
} from "@/types/modules";

import { cn } from "@/lib/utils";
import {
  exportFinancialReportToPDF,
  exportInvoiceToPDF,
  exportRowsToExcel,
  exportRowsToPDF,
} from "@/lib/export";

import { ModuleLoading } from "./module-loading";
import { ModuleError } from "./module-error";
import { ModuleEmpty } from "./module-empty";
import { RecordModal } from "./record-modal";

import { formatModuleValue } from "@/lib/value-format";
import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";

type BasicFilterKey =
  | "all"
  | "attention"
  | "active"
  | "pending"
  | "problem"
  | "with-image";

type ModulePageProps = ModuleConfig &
  Partial<ModuleData> & {
    isLoading?: boolean;
    isError?: boolean;
    emptyMessage?: string;
    actions?: ModuleAction[];
    moduleKey?: string;
    topContent?: ReactNode;

    onCreateRecord?: (row: ModuleRow) => Promise<void> | void;
    onUpdateRecord?: (id: string, row: ModuleRow) => Promise<void> | void;
    onDeleteRecord?: (id: string) => Promise<void> | void;

    isCreating?: boolean;
    isUpdating?: boolean;
    isDeleting?: boolean;
  };

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("active") ||
    normalized.includes("paid") ||
    normalized.includes("approved") ||
    normalized.includes("completed") ||
    normalized.includes("done") ||
    normalized.includes("ready") ||
    normalized.includes("balanced") ||
    normalized.includes("positive") ||
    normalized.includes("posted")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/70";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("progress") ||
    normalized.includes("scheduled") ||
    normalized.includes("probation") ||
    normalized.includes("hot") ||
    normalized.includes("draft") ||
    normalized.includes("sent")
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70";
  }

  if (
    normalized.includes("critical") ||
    normalized.includes("overdue") ||
    normalized.includes("low") ||
    normalized.includes("failed") ||
    normalized.includes("risk") ||
    normalized.includes("late") ||
    normalized.includes("inactive") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("archived")
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/70";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function getStatusValue(row: ModuleRow) {
  const statusEntry = Object.entries(row).find(([key]) =>
    key.toLowerCase().includes("status")
  );

  return String(statusEntry?.[1] ?? "").toLowerCase();
}

function isAttentionStatus(row: ModuleRow) {
  const normalized = getStatusValue(row);

  if (!normalized) return false;

  return [
    "pending",
    "review",
    "risk",
    "overdue",
    "low",
    "critical",
    "late",
    "failed",
    "inactive",
    "draft",
    "cancelled",
    "canceled",
    "archived",
  ].some((keyword) => normalized.includes(keyword));
}

function isActiveStatus(row: ModuleRow) {
  const normalized = getStatusValue(row);

  if (!normalized) return false;

  return [
    "active",
    "ready",
    "paid",
    "approved",
    "completed",
    "done",
    "posted",
    "balanced",
  ].some((keyword) => normalized.includes(keyword));
}

function isPendingStatus(row: ModuleRow) {
  const normalized = getStatusValue(row);

  if (!normalized) return false;

  return [
    "pending",
    "draft",
    "review",
    "progress",
    "scheduled",
    "sent",
    "process",
  ].some((keyword) => normalized.includes(keyword));
}

function isProblemStatus(row: ModuleRow) {
  const normalized = getStatusValue(row);

  if (!normalized) return false;

  return [
    "failed",
    "inactive",
    "cancelled",
    "canceled",
    "critical",
    "overdue",
    "low",
    "risk",
    "late",
    "archived",
  ].some((keyword) => normalized.includes(keyword));
}

function isImageColumn(column: ModuleColumn | ModuleField) {
  const key = column.key.toLowerCase();
  const label = column.label.toLowerCase();

  return (
    key.includes("photo") ||
    key.includes("image") ||
    key.includes("avatar") ||
    key.includes("logo") ||
    label.includes("photo") ||
    label.includes("image") ||
    label.includes("avatar") ||
    label.includes("logo")
  );
}

function isUrlImage(value: string) {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
}

function hasImageValue(row: ModuleRow) {
  return Object.entries(row).some(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    const stringValue = String(value ?? "");

    const isPossibleImageKey =
      normalizedKey.includes("photo") ||
      normalizedKey.includes("image") ||
      normalizedKey.includes("avatar") ||
      normalizedKey.includes("logo");

    return isPossibleImageKey && isUrlImage(stringValue);
  });
}

function matchesBasicFilter(row: ModuleRow, filter: BasicFilterKey) {
  if (filter === "all") return true;
  if (filter === "attention") return isAttentionStatus(row);
  if (filter === "active") return isActiveStatus(row);
  if (filter === "pending") return isPendingStatus(row);
  if (filter === "problem") return isProblemStatus(row);
  if (filter === "with-image") return hasImageValue(row);

  return true;
}

function makeRowKey(row: ModuleRow, index: number) {
  return (
    row.id ||
    row.sku ||
    row.email ||
    row.name ||
    row.code ||
    row.transaction_no ||
    row.invoice_no ||
    row.journal_no ||
    row.product_id ||
    `${Object.values(row).join("-")}-${index}`
  );
}

function formatFieldLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ModuleMetricCard({ metric }: { metric: ModuleMetric }) {
  return (
    <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 dark:border-slate-900 dark:bg-[#050816]/90 dark:hover:shadow-none">
      <p className="text-sm font-bold text-slate-500 dark:text-slate-500">
        {metric.label}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {metric.value}
        </h2>

        {metric.trend ? (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            {metric.trend}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-500">
        {metric.helper}
      </p>
    </div>
  );
}

function TableCellValue({
  column,
  value,
  isPrimary,
}: {
  column: ModuleColumn;
  value: unknown;
  isPrimary: boolean;
}) {
  const rawText = value === null || value === undefined ? "-" : String(value);

  if (isImageColumn(column)) {
    return (
      <div className="flex items-center gap-3">
        {isUrlImage(rawText) ? (
          <img
            src={rawText}
            alt={column.label}
            className="h-10 w-10 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0f2a5f] text-xs font-black text-white dark:bg-blue-700">
            {rawText && rawText !== "-" ? rawText.slice(0, 2).toUpperCase() : "DA"}
          </div>
        )}
      </div>
    );
  }

  return (
    <span
      className={cn(
        "block max-w-[260px] truncate text-sm",
        isPrimary
          ? "font-black text-slate-950 dark:text-white"
          : "font-semibold text-slate-500 dark:text-slate-500"
      )}
    >
      {formatModuleValue(value, column)}
    </span>
  );
}

function DetailModal({
  open,
  title,
  row,
  fields,
  onClose,
}: {
  open: boolean;
  title: string;
  row: ModuleRow | null;
  fields?: ModuleField[];
  onClose: () => void;
}) {
  if (!open || !row) return null;

  const visibleFields =
    fields && fields.length > 0
      ? fields
      : Object.keys(row).map((key) => ({
          key,
          label: formatFieldLabel(key),
        }));

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-900 dark:bg-[#050816]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">
              Detail Record
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Detail {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
              Informasi lengkap data yang dipilih dari table.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-[#02040a]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleFields.map((field) => {
            const rawValue = row[field.key];
            const rawText = String(rawValue ?? "").trim();
            const value = rawText || "-";

            return (
              <div
                key={field.key}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-900 dark:bg-[#02040a]"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  {field.label}
                </p>

                {isImageColumn(field) && isUrlImage(rawText) ? (
                  <img
                    src={rawText}
                    alt={field.label}
                    className="mt-3 h-32 w-32 rounded-2xl object-cover"
                  />
                ) : (
                  <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-900 dark:text-white">
                    {value}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-[#0f2a5f] px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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
  onUpdateRecord,
  onDeleteRecord,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
  tableTitle = "Data Records",
  tableDescription = "Kelola data module, import Excel, export Excel/PDF, dan lakukan aksi data secara cepat.",
}: ModulePageProps) {
  const [localRows, setLocalRows] = useState<ModuleRow[]>([]);
  const [search, setSearch] = useState("");
  const [basicFilter, setBasicFilter] = useState<BasicFilterKey>("all");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ModuleRow | null>(null);
  const [detailRow, setDetailRow] = useState<ModuleRow | null>(null);

  const currentCompanyId = getCurrentCompanyId();
  const canShowCompanyFilter = isCurrentUserSuperAdmin() || !currentCompanyId;

  const baseRows = useMemo(() => {
    return Array.isArray(rows) ? rows : [];
  }, [rows]);

  const tableRows = useMemo(() => {
    const rowMap = new Map<string, ModuleRow>();

    [...baseRows, ...localRows].forEach((row, index) => {
      const key = makeRowKey(row, index);
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

  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      const rowText = Object.values(row).join(" ").toLowerCase();
      const matchesSearch = rowText.includes(search.toLowerCase());
      const matchesFilter = matchesBasicFilter(row, basicFilter);

      return matchesSearch && matchesFilter;
    });
  }, [tableRows, search, basicFilter]);

  const basicFilterButtons: Array<{
    key: BasicFilterKey;
    label: string;
    icon: typeof RotateCcw;
  }> = [
    {
      key: "all",
      label: "All",
      icon: RotateCcw,
    },
    {
      key: "attention",
      label: "Attention",
      icon: Filter,
    },
    {
      key: "active",
      label: "Active",
      icon: CheckCircle2,
    },
    {
      key: "pending",
      label: "Pending",
      icon: Clock3,
    },
    {
      key: "problem",
      label: "Problem",
      icon: AlertTriangle,
    },
    {
      key: "with-image",
      label: "With Image",
      icon: ImageIcon,
    },
  ];

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

      const editingKey = makeRowKey(editingRow, 0);

      setLocalRows((current) =>
        current.map((item) =>
          makeRowKey(item, 0) === editingKey ? { ...item, ...row } : item
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

  async function handleDeleteRecord(row: ModuleRow, rowIndex: number) {
    const confirmed = window.confirm("Yakin ingin menghapus data ini?");

    if (!confirmed) return;

    if (onDeleteRecord) {
      if (!row.id) {
        window.alert("Data ini tidak punya ID, jadi tidak bisa delete ke backend.");
        return;
      }

      await onDeleteRecord(row.id);
      return;
    }

    const rowKey = makeRowKey(row, rowIndex);

    setLocalRows((current) =>
      current.filter((item, index) => makeRowKey(item, index) !== rowKey)
    );
  }

  function handleImportExcel(file: File | null) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;

      if (!data) return;

      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) return;

      const worksheet = workbook.Sheets[firstSheetName];

      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet
      );

      const importedRows: ModuleRow[] = jsonRows.map((item) => {
        const row: ModuleRow = {};

        columns.forEach((column) => {
          const byKey = item[column.key];
          const byLabel = item[column.label];

          row[column.key] = String(byKey ?? byLabel ?? "");
        });

        row.id = crypto.randomUUID();

        return row;
      });

      setLocalRows((current) => [...importedRows, ...current]);
    };

    reader.readAsArrayBuffer(file);
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
              {filteredRows.length} records
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
                <Upload size={16} />
                Import Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
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

            <button
              type="button"
              onClick={openCreateModal}
              disabled={isCreating || isUpdating}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-[#0f2a5f] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100"
            >
              <Plus size={16} />
              {isCreating ? "Saving..." : "New Record"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-900 dark:bg-[#02040a]">
              <Search
                size={17}
                className="text-slate-400 dark:text-slate-600"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records..."
                className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-700"
              />
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-900 dark:bg-[#02040a]/70">
              {basicFilterButtons.map((item) => {
                const ButtonIcon = item.icon;
                const active = basicFilter === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setBasicFilter(item.key)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-sm font-black transition",
                      active
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-300 dark:hover:bg-[#0b1120]"
                    )}
                  >
                    <ButtonIcon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <ModuleEmpty message={emptyMessage} />
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-900 dark:bg-[#02040a]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-900 dark:bg-[#050816]">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600"
                      >
                        {column.label}
                      </th>
                    ))}

                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {filteredRows.map((row, rowIndex) => (
                    <tr
                      key={makeRowKey(row, rowIndex)}
                      className="group transition hover:bg-slate-50/80 dark:hover:bg-[#050816]"
                    >
                      {columns.map((column, columnIndex) => {
                        const value = row[column.key] ?? "-";

                        const isStatus =
                          column.key.toLowerCase().includes("status") ||
                          column.label.toLowerCase().includes("status");

                        return (
                          <td
                            key={column.key}
                            className="px-5 py-4 align-middle"
                          >
                            {isStatus ? (
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
                                  getStatusClass(String(value))
                                )}
                              >
                                {value}
                              </span>
                            ) : (
                              <TableCellValue
                                column={column}
                                value={value}
                                isPrimary={columnIndex === 0}
                              />
                            )}
                          </td>
                        );
                      })}

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailRow(row)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-400 dark:hover:bg-[#0b1120]"
                          >
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(row, rowIndex)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>

                          {isInvoice ? (
                            <button
                              type="button"
                              onClick={() => exportInvoiceToPDF(row)}
                              className="rounded-xl bg-[#0f2a5f] px-3 py-2 text-xs font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Invoice PDF
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                exportRowsToPDF({
                                  filename: `${title} Row`,
                                  title: `${title} Detail`,
                                  columns,
                                  rows: [row],
                                })
                              }
                              className="rounded-xl bg-[#0f2a5f] px-3 py-2 text-xs font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Export
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailRow(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-500 dark:hover:bg-[#0b1120]"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

      <DetailModal
        open={Boolean(detailRow)}
        title={title}
        row={detailRow}
        fields={detailFields}
        onClose={() => setDetailRow(null)}
      />
    </div>
  );
}