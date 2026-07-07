"use client";

import type { ModuleField } from "@/types/modules";

type TableCellValueProps = {
  value: unknown;
  column?: ModuleField;
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getApiBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (fromEnv) return fromEnv.replace(/\/$/, "");

  return "http://localhost:8000";
}

function normalizeFileUrl(value: unknown) {
  if (!hasValue(value)) return "";

  const url = String(value).trim();

  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  if (url.startsWith("/uploads")) {
    return `${getApiBaseUrl()}${url}`;
  }

  if (url.startsWith("uploads/")) {
    return `${getApiBaseUrl()}/${url}`;
  }

  return url;
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
      <div className="flex items-center gap-3">
        <img
          src={imageUrl}
          alt={column?.label ?? "Image"}
          className="h-12 w-12 rounded-2xl border border-slate-200 object-cover dark:border-slate-800"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          className="max-w-[160px] truncate text-xs font-bold text-blue-700 hover:underline dark:text-blue-400"
        >
          View
        </a>
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
      {stringValue}
    </span>
  );
}