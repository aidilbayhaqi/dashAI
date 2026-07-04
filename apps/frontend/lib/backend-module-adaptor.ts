import type { ModuleData, ModuleRow } from "@/types/modules";

export function formatMoney(value: unknown) {
  const number = Number(value ?? 0);

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

export function statusText(value: unknown) {
  if (value === null || value === undefined) return "-";

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

export function makeModuleData({
  rows,
  aiNotes = [],
}: {
  rows: ModuleRow[];
  aiNotes?: string[];
}): ModuleData {
  return {
    metrics: [
      {
        label: "Total Records",
        value: String(rows.length),
        helper: "Data fetched dari backend API",
      },
      {
        label: "Need Attention",
        value: String(
          rows.filter((row) => {
            const status = Object.values(row).join(" ").toLowerCase();

            return [
              "pending",
              "review",
              "draft",
              "overdue",
              "inactive",
              "late",
              "risk",
            ].some((keyword) => status.includes(keyword));
          }).length
        ),
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