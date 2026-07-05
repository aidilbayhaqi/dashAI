import type { ModuleData, ModuleMetric, ModuleRow } from "@/types/modules";
import type { PaginatedResponse } from "@/types/backend";

export type MaybePaginated<T> = PaginatedResponse<T> | T[];

export function rowsFrom<T>(response: MaybePaginated<T> | null | undefined): T[] {
  if (!response) return [];
  return Array.isArray(response) ? response : response.data ?? [];
}

export function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function sumBy<T>(rows: T[], selector: (row: T) => unknown) {
  return rows.reduce((total, row) => total + toNumber(selector(row)), 0);
}

export function uniqueBy<T>(rows: T[], selector: (row: T) => unknown): T[] {
  const map = new Map<string, T>();

  rows.forEach((row, index) => {
    const key = String(selector(row) ?? index);
    map.set(key, row);
  });

  return Array.from(map.values());
}

export function formatMoney(value: unknown) {
  const number = toNumber(value);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMinutes(value: unknown) {
  const minutes = toNumber(value);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours && !remainingMinutes) return "-";
  if (!hours) return `${remainingMinutes}m`;
  if (!remainingMinutes) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}

export function statusText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function makeInitial(value: unknown) {
  const text = String(value || "DA");

  return text
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function countAttentionRows(rows: ModuleRow[]) {
  return rows.filter((row) => {
    const text = Object.values(row).join(" ").toLowerCase();

    return [
      "pending",
      "review",
      "draft",
      "overdue",
      "inactive",
      "late",
      "risk",
      "low stock",
      "cancelled",
      "rejected",
    ].some((keyword) => text.includes(keyword));
  }).length;
}

export function makeModuleData({
  rows,
  metrics,
  aiNotes = [],
}: {
  rows: ModuleRow[];
  metrics?: ModuleMetric[];
  aiNotes?: string[];
}): ModuleData {
  return {
    metrics:
      metrics ??
      [
        {
          label: "Total Records",
          value: String(rows.length),
          helper: "Data fetched dari backend API",
        },
        {
          label: "Need Attention",
          value: String(countAttentionRows(rows)),
          helper: "Data dengan status perlu dicek",
        },
        {
          label: "Source",
          value: "API",
          helper: "Connected to FastAPI backend",
        },
      ],
    rows,
    aiNotes,
  };
}