"use client";

import { AuthenticatedFilePreview } from "@/components/files/authenticated-file-preview";
import { normalizeRuntimeFileUrl } from "@/lib/runtime-url";
import { formatModuleValue } from "@/lib/value-format";
import type { ModuleColumn } from "@/types/modules";

type TableCellValueProps = {
  value: unknown;
  column?: ModuleColumn;
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}


function normalizeFileUrl(value: unknown) {
  return normalizeRuntimeFileUrl(value);
}

function isImageKey(key: string) {
  const normalized = key.toLowerCase();

  return (
    normalized.includes("photo") ||
    normalized.includes("image") ||
    normalized.includes("avatar") ||
    normalized.includes("logo") ||
    normalized.includes("thumbnail")
  );
}

function isImageUrl(value: string) {
  const lower = value.toLowerCase();

  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("/uploads") ||
    lower.startsWith("uploads/") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  );
}

export function TableCellValue({ value, column }: TableCellValueProps) {
  const stringValue = hasValue(value) ? String(value) : "-";
  const key = column?.key ?? "";

  if (stringValue !== "-" && isImageKey(key) && isImageUrl(stringValue)) {
    const imageUrl = normalizeFileUrl(stringValue);

    return (
      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <AuthenticatedFilePreview
          src={imageUrl}
          alt={column?.label ?? "Image"}
          className="h-12 w-12 object-cover"
        />
      </div>
    );
  }

  if (
    stringValue !== "-" &&
    (stringValue.startsWith("http://") ||
      stringValue.startsWith("https://") ||
      stringValue.startsWith("/uploads") ||
      stringValue.startsWith("uploads/"))
  ) {
    const url = normalizeFileUrl(stringValue);

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-bold text-blue-700 hover:underline dark:text-blue-400"
      >
        Open File
      </a>
    );
  }

  return (
    <span className="break-words text-sm font-semibold text-slate-700 dark:text-slate-200">
      {column ? formatModuleValue(value, column) : stringValue}
    </span>
  );
}