"use client";

import {
  Eye,
  FileDown,
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
import {
  RowActionMenu,
  type RowActionMenuItem,
} from "./row-action-menu";


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

  const compactValue = [
    "currency",
    "number",
    "decimal",
    "percent",
    "date",
    "datetime",
  ].includes(column.format ?? "")
    || /(date|period|amount|total|paid|debit|credit|cash|balance)/i.test(`${column.key} ${column.label}`);

  const formattedValue = formatModuleValue(value, column);
  const source = `${column.key} ${column.label}`.toLowerCase();
  const isIdentifier = /(transaction|invoice|journal|reference|account|counterparty|client|customer|type)/i.test(source);
  const shouldTruncate = /(counterparty|account|client|customer|description|memo)/i.test(source);

  return (
    <span
      title={rawText !== "-" ? String(formattedValue) : undefined}
      className={cn(
        "block min-w-0 text-sm leading-5",
        compactValue && "whitespace-nowrap tabular-nums",
        isIdentifier && !shouldTruncate && "whitespace-nowrap",
        shouldTruncate && "max-w-[220px] truncate whitespace-nowrap",
        !compactValue && !isIdentifier && "break-words",
        primary
          ? "font-black text-slate-950 dark:text-white"
          : "font-semibold text-slate-500 dark:text-slate-400",
      )}
    >
      {formattedValue}
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
  const items: RowActionMenuItem[] = [
    {
      label: "Detail",
      icon: Eye,
      onClick: () => onDetail(row),
    },
    ...(getRowActions?.(row) ?? []).map((action) => ({
      label: action.label,
      icon: action.icon,
      disabled: action.disabled,
      href: action.href,
      onClick: action.onClick,
      variant: action.variant === "danger"
        ? "danger" as const
        : action.variant === "primary"
          ? "primary" as const
          : "default" as const,
    })),
  ];

  if (canUpdate) {
    items.push({
      label: "Edit",
      icon: Pencil,
      disabled: isUpdating,
      onClick: () => onEdit(row),
    });
  }

  if (canDelete) {
    items.push({
      label: "Delete",
      icon: Trash2,
      disabled: isDeleting,
      variant: "danger",
      onClick: () => onDelete(row, rowIndex),
    });
  }

  items.push({
    label: isInvoice ? "Download Invoice PDF" : "Export PDF",
    icon: FileDown,
    onClick: () => {
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
    },
  });

  return (
    <div className="flex w-full justify-end">
      <RowActionMenu items={items} />
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
  const normalizedTitle = title.toLowerCase();
  const isFinanceTransactionsTable = normalizedTitle.includes("transaction");

  const desktopTableMinWidth = isFinanceTransactionsTable
    ? "min-w-[1260px]"
    : columns.length >= 9
      ? "min-w-[1180px]"
      : columns.length >= 7
        ? "min-w-[1040px]"
        : "min-w-[860px]";

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
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
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

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className={cn(
          "w-full table-auto border-separate border-spacing-0 text-left",
          desktopTableMinWidth,
        )}>
          <thead>
            <tr className="bg-slate-50 dark:bg-[#050816]">
              <th className="w-14 border-b border-slate-200 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 dark:border-slate-900">No.</th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap border-b border-slate-200 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 dark:border-slate-900",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
              <th className="sticky right-0 z-20 w-[76px] min-w-[76px] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 shadow-[-10px_0_18px_-16px_rgba(15,23,42,0.45)] dark:border-slate-900 dark:bg-[#050816]">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={makeModuleRowKey(row, rowIndex)} className="group transition hover:bg-slate-50/80 dark:hover:bg-[#050816]">
                <td className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-400 dark:border-slate-900">{(currentPage - 1) * pageSize + rowIndex + 1}</td>
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-b border-slate-100 px-4 py-3.5 align-middle dark:border-slate-900",
                      column.className,
                    )}
                  >
                    <div className="min-w-0">
                      <TableValue
                        column={column}
                        value={row[column.key]}
                        primary={columnIndex === 0}
                      />
                    </div>
                  </td>
                ))}
                <td className="sticky right-0 z-10 w-[76px] min-w-[76px] border-b border-slate-100 bg-white px-2 py-3.5 align-middle shadow-[-10px_0_18px_-16px_rgba(15,23,42,0.38)] group-hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:group-hover:bg-[#050816]">
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
