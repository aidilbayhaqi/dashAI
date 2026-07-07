import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { ImagePlus, Loader2, Search, UploadCloud } from "lucide-react";

import type { ModuleFieldOption, ModuleRow } from "@/types/modules";

import {
  getFieldPlaceholder,
  getFieldRequired,
  getFieldType,
  getInputType,
  isFileField,
  isSelectField,
  isTextareaField,
} from "./helpers";
import type { InputField } from "./types";
import { isPreviewableImage } from "./upload";

function isSearchableSelectField(field: InputField) {
  return [
    "employee_id",
    "leave_type_id",
    "lead_id",
    "contact_id",
    "deal_id",
    "product_id",
    "supplier_id",
    "category_id",
    "parent_category_id",
  ].includes(field.key);
}

export function RecordModalField({
  field,
  values,
  isSubmitting,
  uploadingKey,
  options,
  selectPlaceholder,
  selectDisabled,
  onChange,
  onUpload,
}: {
  field: InputField;
  values: ModuleRow;
  isSubmitting: boolean;
  uploadingKey: string | null;
  options: ModuleFieldOption[];
  selectPlaceholder: string;
  selectDisabled: boolean;
  onChange: (key: string, value: string) => void;
  onUpload: (field: InputField, file: File | null) => void;
}) {
  const fieldType = getFieldType(field);
  const required = getFieldRequired(field);
  const placeholder = getFieldPlaceholder(field);
  const currentValue = String(values[field.key] ?? "");
  const isUploading = uploadingKey === field.key;

  const [selectSearch, setSelectSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const keyword = selectSearch.trim().toLowerCase();

    if (!keyword) return options;

    return options.filter((option) => {
      const label = String(option.label ?? "").toLowerCase();
      const value = String(option.value ?? "").toLowerCase();

      return label.includes(keyword) || value.includes(keyword);
    });
  }, [options, selectSearch]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    onUpload(field, file);
    event.target.value = "";
  }

  return (
    <div
      className={
        isTextareaField(field) || isFileField(field)
          ? "space-y-2 md:col-span-2"
          : "space-y-2"
      }
    >
      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {field.label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      {isTextareaField(field) ? (
        <textarea
          value={currentValue}
          required={required}
          disabled={isSubmitting || Boolean(uploadingKey)}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={placeholder}
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-900 dark:bg-[#02040a] dark:text-white dark:disabled:bg-slate-900"
        />
      ) : isSelectField(field) ? (
        <div className="space-y-2">
          {isSearchableSelectField(field) ? (
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={selectSearch}
                disabled={selectDisabled}
                onChange={(event) => setSelectSearch(event.target.value)}
                placeholder={`Search ${field.label.toLowerCase()}...`}
                className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-900 dark:bg-[#02040a] dark:text-white dark:disabled:bg-slate-900"
              />
            </div>
          ) : null}

          <select
            value={currentValue}
            required={required}
            disabled={selectDisabled}
            onChange={(event) => onChange(field.key, event.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-900 dark:bg-[#02040a] dark:text-white dark:disabled:bg-slate-900"
          >
            <option value="">{selectPlaceholder}</option>

            {filteredOptions.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>

          {isSearchableSelectField(field) && options.length > 0 ? (
            <p className="text-xs font-semibold text-slate-400">
              {filteredOptions.length} dari {options.length} pilihan tersedia.
            </p>
          ) : null}
        </div>
      ) : isFileField(field) ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-900 dark:bg-[#02040a]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-900 dark:bg-[#050816]">
              {currentValue && isPreviewableImage(currentValue) ? (
                <img
                  src={currentValue}
                  alt={field.label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus
                  size={30}
                  className="text-slate-400 dark:text-slate-600"
                />
              )}
            </div>

            <div className="flex-1">
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-[#0f2a5f] px-4 text-sm font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600">
                {isUploading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <UploadCloud size={17} />
                )}

                {isUploading ? "Uploading..." : "Upload File"}

                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  disabled={isUploading}
                  required={required && !currentValue}
                  onChange={handleFileChange}
                />
              </label>

              <input
                type="text"
                value={currentValue}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder="URL file akan muncul otomatis setelah upload"
                className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 dark:border-slate-900 dark:bg-[#050816] dark:text-white"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Setelah file berhasil di-upload, URL-nya akan masuk ke field{" "}
                <b>{field.key}</b>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <input
          type={getInputType(fieldType)}
          value={currentValue}
          required={required}
          disabled={isSubmitting || Boolean(uploadingKey)}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-900 dark:bg-[#02040a] dark:text-white dark:disabled:bg-slate-900"
        />
      )}
    </div>
  );
}