"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Edit3,
  FileText,
  Info,
  Layers3,
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
  shouldHideRecordField,
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
    .filter((field) => !isSystemRecordKey(field.key))
    .filter((field) => !shouldHideRecordField(field.key, row[field.key]))
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
    .filter((key) => !shouldHideRecordField(key, row[key]))
    .filter((key) => String(row[key] ?? "").trim() !== "")
    .map((key) => ({
      key,
      label: formatRecordFieldLabel(key),
      column: columnMap.get(key),
    }));

  const activityFields: DetailField[] = Object.keys(row)
    .filter((key) => isSystemRecordKey(key))
    .filter((key) => String(row[key] ?? "").trim() !== "")
    .map((key) => ({
      key,
      label: formatRecordFieldLabel(key),
      column: columnMap.get(key),
    }));

  return {
    primaryFields: [...preferredFields, ...extraFields],
    activityFields,
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
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-indigo-700 dark:hover:bg-slate-900 dark:hover:text-indigo-300"
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
          className="max-h-72 w-full object-contain"
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

function formatActivityValue(row: ModuleRow, field: DetailField) {
  return formatModuleValue(row[field.key], {
    key: field.key,
    label: field.label,
    format: "datetime",
  });
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
        activityFields: [],
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
  const updatedField = detailFields.activityFields.find(
    (field) => field.key === "updated_at"
  );
  const createdField = detailFields.activityFields.find(
    (field) => field.key === "created_at"
  );

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 px-3 py-5 backdrop-blur-md sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-dialog-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] sm:max-h-[94vh] sm:rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-slate-950/40 dark:bg-[#050816]">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white sm:p-7">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                  {title} · Detail
                </p>
                <h2
                  id="detail-dialog-title"
                  className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl"
                >
                  {recordTitle}
                </h2>
                <p className="mt-1 max-w-2xl break-words text-sm leading-6 text-slate-300">
                  {recordSubtitle}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {status ? (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
                        getRecordStatusClass(status)
                      )}
                    >
                      {status}
                    </span>
                  ) : null}
                  {updatedField ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                      <Clock3 size={13} />
                      Updated {formatActivityValue(row, updatedField)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-slate-200 transition hover:bg-white/20 hover:text-white"
              aria-label="Tutup detail"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-5 dark:bg-[#02040a] sm:p-7">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-900 dark:bg-[#050816] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <Layers3 size={18} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Record information
                  </p>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">
                    Informasi utama
                  </h3>
                </div>
              </div>

              {detailFields.primaryFields.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {detailFields.primaryFields.map((field) => (
                    <div
                      key={field.key}
                      className={cn(
                        "rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-white dark:border-slate-900 dark:bg-[#02040a] dark:hover:border-indigo-900 dark:hover:bg-[#050816]",
                        (isLongRecordField(field.key) ||
                          isRecordFileField(field)) &&
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
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
                  Tidak ada informasi publik yang dapat ditampilkan.
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Activity
                    </p>
                    <h3 className="font-black text-slate-950 dark:text-white">
                      Riwayat record
                    </h3>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {createdField ? (
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-[#02040a]">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        <CalendarDays size={14} /> Dibuat
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                        {formatActivityValue(row, createdField)}
                      </p>
                    </div>
                  ) : null}

                  {updatedField ? (
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-[#02040a]">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        <Clock3 size={14} /> Terakhir diperbarui
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                        {formatActivityValue(row, updatedField)}
                      </p>
                    </div>
                  ) : null}

                  {detailFields.activityFields
                    .filter(
                      (field) =>
                        field.key !== "created_at" &&
                        field.key !== "updated_at"
                    )
                    .map((field) => (
                      <div
                        key={field.key}
                        className="rounded-2xl bg-slate-50 p-4 dark:bg-[#02040a]"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          {field.label}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                          {formatActivityValue(row, field)}
                        </p>
                      </div>
                    ))}
                </div>
              </section>

              <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-4 text-sm text-indigo-950 dark:border-indigo-950 dark:bg-indigo-950/20 dark:text-indigo-200">
                <Info size={18} className="mt-0.5 shrink-0" />
                <p className="leading-6">
                  UUID dan identifier teknis disembunyikan agar detail tetap bersih dan mudah dibaca.
                </p>
              </div>
            </aside>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-900 dark:bg-[#050816] sm:flex-row sm:items-center sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Close
          </button>

          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-950/15 transition hover:-translate-y-0.5 hover:bg-indigo-500"
            >
              <Edit3 size={16} />
              Edit record
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
