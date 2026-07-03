"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import type {
  ModuleAction,
  ModuleColumn,
  ModuleConfig,
  ModuleData,
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

type ModulePageProps = ModuleConfig &
  ModuleData & {
    isLoading?: boolean;
    isError?: boolean;
    emptyMessage?: string;
    actions?: ModuleAction[];
    moduleKey?: string;
    topContent?: ReactNode;
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
    normalized.includes("positive")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/70";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("progress") ||
    normalized.includes("scheduled") ||
    normalized.includes("probation") ||
    normalized.includes("hot")
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70";
  }

  if (
    normalized.includes("critical") ||
    normalized.includes("overdue") ||
    normalized.includes("low") ||
    normalized.includes("failed") ||
    normalized.includes("risk") ||
    normalized.includes("late")
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/70";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function isAttentionStatus(row: ModuleRow) {
  const status = Object.entries(row).find(([key]) =>
    key.toLowerCase().includes("status")
  )?.[1];

  if (!status) return false;

  const normalized = status.toLowerCase();

  return [
    "pending",
    "review",
    "risk",
    "overdue",
    "low",
    "critical",
    "late",
    "failed",
  ].some((keyword) => normalized.includes(keyword));
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

export function ModulePage({
  badge,
  title,
  description,
  icon: Icon,
  columns,
  metrics,
  rows,
  isLoading,
  isError,
  emptyMessage,
  moduleKey,
  topContent,
  tableTitle = "Data Records",
  tableDescription = "Kelola data module, import Excel, export Excel/PDF, dan lakukan aksi data secara cepat.",
}: ModulePageProps) {
  const [tableRows, setTableRows] = useState<ModuleRow[]>(rows);
  const [search, setSearch] = useState("");
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  useEffect(() => {
    setTableRows(rows);
  }, [rows]);

  const normalizedTitle = `${title} ${moduleKey ?? ""}`.toLowerCase();

  const isInvoice = normalizedTitle.includes("invoice");
  const isFinanceReport =
    normalizedTitle.includes("finance") ||
    normalizedTitle.includes("tax") ||
    normalizedTitle.includes("ledger") ||
    normalizedTitle.includes("cashflow");

  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      const values = Object.values(row).join(" ").toLowerCase();
      const matchesSearch = values.includes(search.toLowerCase());
      const matchesFilter = showAttentionOnly ? isAttentionStatus(row) : true;

      return matchesSearch && matchesFilter;
    });
  }, [tableRows, search, showAttentionOnly]);

  function handleAddRecord(row: ModuleRow) {
    setTableRows((current) => [row, ...current]);
  }

  function handleImportExcel(file: File | null) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
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

        return row;
      });

      setTableRows((current) => [...importedRows, ...current]);
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

  function handleDetail(row: ModuleRow) {
    window.alert(JSON.stringify(row, null, 2));
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
                  <Icon size={24} />
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

        <div className="p-6">
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <ModuleMetricCard key={metric.label} metric={metric} />
            ))}
          </section>
        </div>
      </section>

      {topContent ? <section>{topContent}</section> : null}

      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
        <div className="mb-5 flex flex-col gap-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                {tableTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
                {tableDescription}
              </p>
            </div>
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
                onClick={handleExportExcel}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]"
              >
                <FileSpreadsheet size={16} />
                Export Excel
              </button>

              <button
                onClick={handleExportPDF}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]"
              >
                <FileText size={16} />
                Export PDF
              </button>

              {isInvoice ? (
                <button
                  onClick={handleExportInvoice}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0f2a5f] px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Download size={16} />
                  Export Invoice
                </button>
              ) : null}

              {isFinanceReport ? (
                <button
                  onClick={handleExportReport}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0f2a5f] px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Download size={16} />
                  Export Report
                </button>
              ) : null}
            </div>

            <button
              onClick={() => setRecordModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-[#0f2a5f] dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100"
            >
              <Plus size={16} />
              New Record
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-900 dark:bg-[#02040a]">
              <Search size={17} className="text-slate-400 dark:text-slate-600" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records..."
                className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-700 lg:w-96"
              />
            </div>

            <button
              onClick={() => setShowAttentionOnly((current) => !current)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition",
                showAttentionOnly
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]"
              )}
            >
              <Filter size={16} />
              {showAttentionOnly ? "Showing Attention" : "Filter Attention"}
            </button>
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
                      key={rowIndex}
                      className="group transition hover:bg-slate-50/80 dark:hover:bg-[#050816]"
                    >
                      {columns.map((column, columnIndex) => {
                        const value = row[column.key] ?? "-";

                        const isStatus =
                          column.key.toLowerCase().includes("status") ||
                          column.label.toLowerCase().includes("status");

                        return (
                          <td key={column.key} className="px-5 py-4 align-middle">
                            {isStatus ? (
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
                                  getStatusClass(value)
                                )}
                              >
                                {value}
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "block max-w-[260px] truncate text-sm",
                                  columnIndex === 0
                                    ? "font-black text-slate-950 dark:text-white"
                                    : "font-semibold text-slate-500 dark:text-slate-500"
                                )}
                              >
                                {value}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDetail(row)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-400 dark:hover:bg-[#0b1120]"
                          >
                            Detail
                          </button>

                          {isInvoice ? (
                            <button
                              onClick={() => exportInvoiceToPDF(row)}
                              className="rounded-xl bg-[#0f2a5f] px-3 py-2 text-xs font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Invoice PDF
                            </button>
                          ) : (
                            <button
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
                            onClick={() => handleDetail(row)}
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
        moduleKey={moduleKey}
        columns={columns}
        onClose={() => setRecordModalOpen(false)}
        onSubmit={handleAddRecord}
      />
    </div>
  );
}