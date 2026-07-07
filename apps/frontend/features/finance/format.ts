import type { ModuleRow } from "@/types/modules";

export function pick(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

export function toNumber(value: string | number | undefined | null) {
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  if (!value) return 0;

  const raw = String(value).trim();

  if (!raw) return 0;

  const withoutCurrency = raw
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "");

  let normalized = withoutCurrency;

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replaceAll(".", "").replaceAll(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replaceAll(",", ".");
  }

  normalized = normalized.replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return 0;

  return parsed;
}

export function formatMoney(value: string | number | undefined | null) {
  const parsed = toNumber(value);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

export function formatDate(value: string | undefined | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function shortId(value: string | undefined | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;

  return `${value.slice(0, 8)}...`;
}

export function statusText(value: string | undefined | null) {
  if (!value) return "Draft";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}