"use client";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  exportInvoiceToPDF,
  exportRowsToPDF,
} from "@/lib/export";
import { cn } from "@/lib/utils";
import { formatModuleValue } from "@/lib/value-format";
import type {
  ModuleAction,
  ModuleColumn,
  ModuleRow,
} from "@/types/modules";

import { ModulePagination } from "./module-pagination";


export function makeModuleRowKey(row: ModuleRow, index: number) {
  return (
    row.id
    || row.sku
    || row.email
    || row.name
    || row.code
    || row.transaction_no
    || row.invoice_no
    || row.journal_no
    || row.product_id
    || `${Object.values(row).join("-")}-${index}`
  );
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();
  if (["active", "paid", "approved", "completed", "done", "ready", "balanced", "positive", "posted"].some((item) => normalized.includes(item))) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/70";
  }
  if (["pending", "review", "progress", "scheduled", "probation", "hot", "draft", "sent"].some((item) => normalized.includes(item))) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70";
  }
  if (["critical", "overdue", "low", "failed", "risk", "late", "inactive", "cancelled", "canceled", "archived"].some((item) => normalized.includes(item))) {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/70";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function isStatusColumn(column: ModuleColumn) {
  return column.key.toLowerCase().includes("status")
    || column.label.toLowerCase().includes("status");
}

function isImageColumn(column: ModuleColumn) {
  const source = `${column.key} ${column.label}`.toLowerCase();
  return ["photo", "image", "avatar", "logo"].some((word) => source.includes(word));
}

function isUrlImage(value: string) {
  return value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("/");
}

function TableValue({
  column,
  value,
  primary = false,
}: {
  column: ModuleColumn;
  value: unknown;
  primary?: boolean;
}) {
  const rawText = value === null || value === undefined ? "-" : String(value);

  if (isImageColumn(column)) {
    return isUrlImage(rawText) ? (
      <img
        src={rawText}
        alt={column.label}
        className="h-10 w-10 rounded-2xl object-cover"
      />
    ) : (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f2a5f] text-xs font-black text-white dark:bg-blue-700">
        {rawText !== "-" ? rawText.slice(0, 2).toUpperCase() : "DA"}
      </div>
    );
  }

  if (isStatusColumn(column)) {
    return (
      <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-black ring-1", getStatusClass(rawText))}>
        {formatModuleValue(value, column)}
      </span>
    );
  }

  return (
    <span className={cn(
      "block max-w-[280px] break-words text-sm",
      primary
        ? "font-black text-slate-950 dark:text-white"
        : "font-semibold text-slate-500 dark:text-slate-400",
    )}>
      {formatModuleValue(value, column)}
    </span>
  );
}

function RowActions({
  row,
  rowIndex,
  title,
  columns,
  isInvoice,
  canUpdate,
  canDelete,
  isUpdating,
  isDeleting,
  getRowActions,
  onDetail,
  onEdit,
  onDelete,
}: {
  row: ModuleRow;
  rowIndex: number;
  title: string;
  columns: ModuleColumn[];
  isInvoice: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  getRowActions?: (row: ModuleRow) => ModuleAction[];
  onDetail: (row: ModuleRow) => void;
  onEdit: (row: ModuleRow) => void;
  onDelete: (row: ModuleRow, rowIndex: number) => void;
}) {
  return (
    <div className="flex min-w-max items-center gap-2">
      <button type="button" onClick={() => onDetail(row)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-[#050816] dark:text-slate-300">
        <Eye size={13} /> Detail
      </button>

      {(getRowActions?.(row) ?? []).map((action) => {
        const ActionIcon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => void action.onClick?.()}
            disabled={action.disabled}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60",
              action.variant === "danger"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : action.variant === "primary"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700",
            )}
          >
            {ActionIcon ? <ActionIcon size={13} /> : null}
            {action.label}
          </button>
        );
      })}

      {canUpdate ? (
        <button type="button" onClick={() => onEdit(row)} disabled={isUpdating} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-60">
          <Pencil size={13} /> Edit
        </button>
      ) : null}

      {canDelete ? (
        <button type="button" onClick={() => onDelete(row, rowIndex)} disabled={isDeleting} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-60">
          <Trash2 size={13} /> Delete
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (isInvoice) {
            exportInvoiceToPDF(row);
            return;
          }
          exportRowsToPDF({
            filename: `${title} Row`,
            title: `${title} Detail`,
            columns,
            rows: [row],
          });
        }}
        className="rounded-xl bg-[#0f2a5f] px-3 py-2 text-xs font-black text-white transition hover:bg-blue-950 dark:bg-blue-700"
      >
        {isInvoice ? "Invoice PDF" : "Export"}
      </button>
    </div>
  );
}

export function ModuleTable({
  title,
  columns,
  rows,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startItem,
  endItem,
  isInvoice,
  canUpdate,
  canDelete,
  isUpdating,
  isDeleting,
  getRowActions,
  onDetail,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
}: {
  title: string;
  columns: ModuleColumn[];
  rows: ModuleRow[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  isInvoice: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  getRowActions?: (row: ModuleRow) => ModuleAction[];
  onDetail: (row: ModuleRow) => void;
  onEdit: (row: ModuleRow) => void;
  onDelete: (row: ModuleRow, rowIndex: number) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-900 dark:bg-[#02040a]">
      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row, rowIndex) => (
          <article key={makeModuleRowKey(row, rowIndex)} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="grid gap-3 sm:grid-cols-2">
              {columns.map((column, columnIndex) => (
                <div key={column.key} className={columnIndex === 0 ? "sm:col-span-2" : ""}>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{column.label}</p>
                  <div className="mt-1"><TableValue column={column} value={row[column.key]} primary={columnIndex === 0} /></div>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto pb-1">
              <RowActions
                row={row}
                rowIndex={rowIndex}
                title={title}
                columns={columns}
                isInvoice={isInvoice}
                canUpdate={canUpdate}
                canDelete={canDelete}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
                getRowActions={getRowActions}
                onDetail={onDetail}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-900 dark:bg-[#050816]">
              <th className="w-16 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">No.</th>
              {columns.map((column) => <th key={column.key} className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{column.label}</th>)}
              <th className="sticky right-0 bg-slate-50 px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:bg-[#050816]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {rows.map((row, rowIndex) => (
              <tr key={makeModuleRowKey(row, rowIndex)} className="group transition hover:bg-slate-50/80 dark:hover:bg-[#050816]">
                <td className="px-5 py-4 text-sm font-black text-slate-400">{(currentPage - 1) * pageSize + rowIndex + 1}</td>
                {columns.map((column, columnIndex) => (
                  <td key={column.key} className="px-5 py-4 align-middle"><TableValue column={column} value={row[column.key]} primary={columnIndex === 0} /></td>
                ))}
                <td className="sticky right-0 bg-white px-5 py-4 text-right group-hover:bg-slate-50/80 dark:bg-[#02040a] dark:group-hover:bg-[#050816]">
                  <RowActions
                    row={row}
                    rowIndex={rowIndex}
                    title={title}
                    columns={columns}
                    isInvoice={isInvoice}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    isUpdating={isUpdating}
                    isDeleting={isDeleting}
                    getRowActions={getRowActions}
                    onDetail={onDetail}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModulePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        startItem={startItem}
        endItem={endItem}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
