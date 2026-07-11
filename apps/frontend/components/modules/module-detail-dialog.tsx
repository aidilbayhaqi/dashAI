"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Edit3,
  FileText,
  Info,
  X,
} from "lucide-react";

import { AuthenticatedFilePreview } from "@/components/files/authenticated-file-preview";
import { cn } from "@/lib/utils";
import { formatModuleValue } from "@/lib/value-format";
import type {
  ModuleColumn,
  ModuleField,
  ModuleRow,
} from "@/types/modules";

import {
  formatRecordFieldLabel,
  getRecordStatus,
  getRecordStatusClass,
  getRecordSubtitle,
  getRecordTitle,
  isLongRecordField,
  isRecordFileField,
  isRecordImageField,
  isSystemRecordKey,
} from "./module-record-utils";

type DetailField = ModuleField & {
  column?: ModuleColumn;
};

function buildDetailFields({
  row,
  fields,
  columns,
}: {
  row: ModuleRow;
  fields?: ModuleField[];
  columns: ModuleColumn[];
}) {
  const columnMap = new Map(columns.map((column) => [column.key, column]));
  const usedKeys = new Set<string>();

  const configuredFields: ModuleField[] =
    fields && fields.length > 0
      ? fields
      : columns
          .filter((column) => !column.hidden)
          .map((column) => ({
            key: column.key,
            label: column.label,
          }));

  const preferredFields: DetailField[] = configuredFields
    .filter((field) => !field.hidden)
    .map((field) => {
      usedKeys.add(field.key);
      return {
        ...field,
        column: columnMap.get(field.key),
      };
    });

  const extraFields: DetailField[] = Object.keys(row)
    .filter((key) => !usedKeys.has(key))
    .filter((key) => !isSystemRecordKey(key))
    .filter((key) => String(row[key] ?? "").trim() !== "")
    .map((key) => ({
      key,
      label: formatRecordFieldLabel(key),
      column: columnMap.get(key),
    }));

  const metadataFields: DetailField[] = Object.keys(row)
    .filter((key) => isSystemRecordKey(key))
    .filter((key) => String(row[key] ?? "").trim() !== "")
    .map((key) => ({
      key,
      label: formatRecordFieldLabel(key),
      column: columnMap.get(key),
    }));

  return {
    primaryFields: [...preferredFields, ...extraFields],
    metadataFields,
  };
}

function CopyValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-300"
      aria-label="Salin nilai"
      title="Salin nilai"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function DetailValue({
  row,
  field,
}: {
  row: ModuleRow;
  field: DetailField;
}) {
  const rawValue = row[field.key];
  const rawText = String(rawValue ?? "").trim();
  const fallbackColumn: ModuleColumn = {
    key: field.key,
    label: field.label,
  };
  const column = field.column ?? fallbackColumn;

  if (isRecordFileField(field) && rawText) {
    return (
      <div className="relative mt-3 flex min-h-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050816]">
        <AuthenticatedFilePreview
          src={rawText}
          alt={field.label}
          filename={rawText.split("/").pop()}
          className="max-h-64 w-full object-contain"
          showDownload
          downloadLabel="Download"
        />
      </div>
    );
  }

  const formattedValue = formatModuleValue(rawValue, column);
  const statusField =
    field.key.toLowerCase().includes("status") ||
    field.label.toLowerCase().includes("status");

  if (statusField && formattedValue !== "-") {
    return (
      <span
        className={cn(
          "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
          getRecordStatusClass(formattedValue)
        )}
      >
        {formattedValue}
      </span>
    );
  }

  return (
    <div className="mt-2 flex items-start justify-between gap-3">
      <p className="min-w-0 break-words text-sm font-bold leading-6 text-slate-900 dark:text-white">
        {formattedValue}
      </p>
      {formattedValue !== "-" ? <CopyValueButton value={formattedValue} /> : null}
    </div>
  );
}

export function ModuleDetailDialog({
  open,
  title,
  row,
  fields,
  columns,
  onClose,
  onEdit,
}: {
  open: boolean;
  title: string;
  row: ModuleRow | null;
  fields?: ModuleField[];
  columns: ModuleColumn[];
  onClose: () => void;
  onEdit?: (row: ModuleRow) => void;
}) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const detailFields = useMemo(() => {
    if (!row) {
      return {
        primaryFields: [],
        metadataFields: [],
      };
    }

    return buildDetailFields({
      row,
      fields,
      columns,
    });
  }, [columns, fields, row]);

  if (!open || !row) return null;

  const recordTitle = getRecordTitle(row);
  const recordSubtitle = getRecordSubtitle(row);
  const status = getRecordStatus(row);
  const imageField = detailFields.primaryFields.find(isRecordImageField);
  const imageValue = imageField ? String(row[imageField.key] ?? "").trim() : "";

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/75 px-3 py-5 backdrop-blur-md sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-dialog-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-slate-950/30 dark:border-slate-900 dark:bg-[#050816]">
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/80 p-5 dark:border-slate-900 dark:from-[#02040a] dark:via-[#050816] dark:to-blue-950/20 sm:p-7">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-700/10" />

          <div className="relative flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0f2a5f] text-white shadow-lg shadow-blue-950/20 dark:bg-blue-700">
                {imageValue ? (
                  <AuthenticatedFilePreview
                    src={imageValue}
                    alt={recordTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileText size={25} />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">
                  {title} / Detail Record
                </p>
                <h2
                  id="detail-dialog-title"
                  className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl"
                >
                  {recordTitle}
                </h2>
                <p className="mt-1 max-w-2xl break-words text-sm leading-6 text-slate-500">
                  {recordSubtitle}
                </p>

                {status ? (
                  <span
                    className={cn(
                      "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
                      getRecordStatusClass(status)
                    )}
                  >
                    {status}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-950 dark:border-slate-800 dark:bg-[#02040a] dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label="Tutup detail"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900 dark:border-blue-950 dark:bg-blue-950/20 dark:text-blue-200">
            <Info size={18} className="shrink-0" />
            <p>
              Data ditampilkan sesuai konfigurasi kolom modul. Informasi sistem dipisahkan agar detail utama tetap mudah dibaca.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {detailFields.primaryFields.map((field) => (
              <div
                key={field.key}
                className={cn(
                  "rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white dark:border-slate-900 dark:bg-[#02040a] dark:hover:border-slate-800 dark:hover:bg-[#050816]",
                  (isLongRecordField(field.key) || isRecordFileField(field)) &&
                    "md:col-span-2"
                )}
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  {field.label}
                </p>
                <DetailValue row={row} field={field} />
              </div>
            ))}
          </div>

          {detailFields.metadataFields.length > 0 ? (
            <details className="group mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-900 dark:bg-[#02040a]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-black text-slate-700 dark:text-slate-300">
                <span>System Information</span>
                <ChevronDown
                  size={17}
                  className="transition group-open:rotate-180"
                />
              </summary>

              <div className="grid gap-3 border-t border-slate-200 p-4 dark:border-slate-900 md:grid-cols-2">
                {detailFields.metadataFields.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-xl bg-slate-50 p-3 dark:bg-[#050816]"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                      {field.label}
                    </p>
                    <DetailValue row={row} field={field} />
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-900 dark:bg-[#02040a]/80 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-[#050816] dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Tutup
          </button>

          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Edit3 size={17} />
              Edit Record
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
