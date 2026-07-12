"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-error";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import type {
  ModuleColumn,
  ModuleField,
  ModuleFieldOption,
  ModuleRow,
} from "@/types/modules";

import { RecordModalField } from "./record-modal/field-input";
import {
  buildInitialValues,
  getStaticOptions,
  isHiddenField,
  isSelectField,
} from "./record-modal/helpers";
import { fetchOptionsForField } from "./record-modal/lookups";
import type { InputField } from "./record-modal/types";
import {
  getUploadContext,
  uploadRecordFile,
} from "./record-modal/upload";

type RecordModalProps = {
  open: boolean;
  title: string;
  mode?: "create" | "edit";
  moduleKey?: string;
  columns: ModuleColumn[];
  fields?: ModuleField[];
  initialRow?: ModuleRow | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (row: ModuleRow) => Promise<void> | void;
};

const dependentCompanyFields = [
  "branch_id",
  "employee_id",
  "leave_type_id",
  "product_id",
  "category_id",
  "parent_category_id",
  "supplier_id",
  "cash_account_id",
  "transaction_id",
  "period_id",
  "tax_rate_id",
  "lead_id",
  "contact_id",
  "deal_id",
];

export function RecordModal({
  open,
  title,
  mode = "create",
  moduleKey,
  columns,
  fields,
  initialRow,
  isSubmitting = false,
  onClose,
  onSubmit,
}: RecordModalProps) {
  const inputFields = useMemo<InputField[]>(
    () => fields?.length ? fields : columns,
    [columns, fields],
  );
  const [values, setValues] = useState<ModuleRow>(() => (
    buildInitialValues(inputFields, initialRow)
  ));
  const [optionsByKey, setOptionsByKey] = useState<Record<string, ModuleFieldOption[]>>({});
  const [loadingByKey, setLoadingByKey] = useState<Record<string, boolean>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const companyId = String(values.company_id ?? "");
  const canChooseCompany = isCurrentUserSuperAdmin() || !getCurrentCompanyId();
  const busy = isSubmitting || Boolean(uploadingKey);

  useEffect(() => {
    if (!open) return;
    setValues(buildInitialValues(inputFields, initialRow));
    setOptionsByKey({});
    setLoadingByKey({});
    setUploadingKey(null);
    setFormError(null);
  }, [initialRow, inputFields, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const lookupFields = inputFields.filter((field) => (
      isSelectField(field) && getStaticOptions(field).length === 0
    ));

    async function loadLookups() {
      await Promise.all(lookupFields.map(async (field) => {
        setLoadingByKey((current) => ({ ...current, [field.key]: true }));
        try {
          const options = await fetchOptionsForField(field.key, companyId);
          if (!cancelled) {
            setOptionsByKey((current) => ({ ...current, [field.key]: options }));
          }
        } catch (error: unknown) {
          if (!cancelled) {
            setFormError(getApiErrorMessage(error, `Lookup ${field.label} gagal dimuat.`));
          }
        } finally {
          if (!cancelled) {
            setLoadingByKey((current) => ({ ...current, [field.key]: false }));
          }
        }
      }));
    }

    void loadLookups();
    return () => { cancelled = true; };
  }, [companyId, inputFields, open]);

  function updateValue(key: string, value: string) {
    setFormError(null);
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "company_id") {
        for (const dependentKey of dependentCompanyFields) next[dependentKey] = "";
      }
      return next;
    });
  }

  function getOptions(field: InputField): ModuleFieldOption[] {
    const staticOptions = getStaticOptions(field);
    return staticOptions.length ? staticOptions : optionsByKey[field.key] ?? [];
  }

  function getSelectPlaceholder(field: InputField): string {
    if (loadingByKey[field.key]) return `Loading ${field.label}...`;
    if (field.key === "branch_id" && !companyId) return "Pilih company dulu";
    if (isSelectField(field) && getOptions(field).length === 0) {
      return `${field.label} belum tersedia`;
    }
    return `Pilih ${field.label}`;
  }

  function isSelectDisabled(field: InputField): boolean {
    if (busy || loadingByKey[field.key]) return true;
    if (field.key === "company_id" && !canChooseCompany) return true;
    return field.key === "branch_id" && !companyId;
  }

  async function handleUpload(field: InputField, file: File | null) {
    if (!file) return;
    try {
      setFormError(null);
      setUploadingKey(field.key);
      const url = await uploadRecordFile(file, {
        context: getUploadContext(field.key, moduleKey),
        companyId: String(values.company_id ?? "").trim() || undefined,
      });
      updateValue(field.key, url);
    } catch (error: unknown) {
      setFormError(getApiErrorMessage(error, "Upload file gagal."));
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setFormError(null);
      await onSubmit(values);
    } catch (error: unknown) {
      setFormError(getApiErrorMessage(error, "Data gagal disimpan."));
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-[2rem] dark:border-slate-900 dark:bg-[#050816]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-slate-900">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              {mode === "edit" ? "Edit record" : "Create record"}
            </p>
            <h2 id="record-modal-title" className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup modal"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            {formError ? (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {inputFields.filter((field) => !isHiddenField(field)).map((field) => (
                <RecordModalField
                  key={field.key}
                  field={field}
                  values={values}
                  isSubmitting={isSubmitting}
                  uploadingKey={uploadingKey}
                  options={getOptions(field)}
                  selectPlaceholder={getSelectPlaceholder(field)}
                  selectDisabled={isSelectDisabled(field)}
                  onChange={updateValue}
                  onUpload={(selectedField, file) => void handleUpload(selectedField, file)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-900">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-11 w-full rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 sm:w-auto dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : null}
              {mode === "edit" ? "Save Changes" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
