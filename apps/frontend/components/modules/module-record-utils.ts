import type {
  ModuleColumn,
  ModuleField,
  ModuleRow,
} from "@/types/modules";

const TITLE_KEYS = [
  "name",
  "title",
  "full_name",
  "product_name",
  "employee_name",
  "client_name",
  "company_name",
  "invoice_no",
  "transaction_no",
  "journal_no",
  "sku",
  "code",
  "email",
];

const SUBTITLE_KEYS = [
  "description",
  "legal_name",
  "category_name",
  "branch_name",
  "department_name",
  "contact_person",
  "reference_no",
  "email",
  "phone",
];

const SYSTEM_KEYS = new Set([
  "id",
  "company_id",
  "branch_id",
  "created_by_id",
  "updated_by_id",
  "deleted_by_id",
  "created_at",
  "updated_at",
  "deleted_at",
]);

export function formatRecordFieldLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getRecordTitle(row: ModuleRow | null | undefined) {
  if (!row) return "Record";

  for (const key of TITLE_KEYS) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }

  return "Record";
}

export function getRecordSubtitle(row: ModuleRow | null | undefined) {
  if (!row) return "";

  for (const key of SUBTITLE_KEYS) {
    const value = String(row[key] ?? "").trim();
    if (value && value !== getRecordTitle(row)) return value;
  }

  const id = String(row.id ?? "").trim();
  return id ? `ID ${id}` : "Informasi record terpilih";
}

export function getRecordStatus(row: ModuleRow | null | undefined) {
  if (!row) return "";

  const statusEntry = Object.entries(row).find(([key]) =>
    key.toLowerCase().includes("status")
  );

  return String(statusEntry?.[1] ?? "").trim();
}

export function getRecordStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (
    [
      "active",
      "paid",
      "approved",
      "completed",
      "done",
      "ready",
      "balanced",
      "positive",
      "posted",
    ].some((keyword) => normalized.includes(keyword))
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/70";
  }

  if (
    [
      "pending",
      "review",
      "progress",
      "scheduled",
      "probation",
      "draft",
      "sent",
    ].some((keyword) => normalized.includes(keyword))
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70";
  }

  if (
    [
      "critical",
      "overdue",
      "low",
      "failed",
      "risk",
      "late",
      "inactive",
      "cancelled",
      "canceled",
      "archived",
      "void",
    ].some((keyword) => normalized.includes(keyword))
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/70";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

export function isRecordImageField(
  field: ModuleField | ModuleColumn
) {
  const key = field.key.toLowerCase();
  const label = field.label.toLowerCase();
  const format = "format" in field ? field.format : undefined;
  const type = "type" in field ? field.type : undefined;

  return (
    format === "image" ||
    type === "file" &&
      (key.includes("image") ||
        key.includes("photo") ||
        key.includes("avatar") ||
        key.includes("logo")) ||
    key.includes("image") ||
    key.includes("photo") ||
    key.includes("avatar") ||
    key.includes("logo") ||
    label.includes("image") ||
    label.includes("photo") ||
    label.includes("avatar") ||
    label.includes("logo")
  );
}

export function isRecordFileField(
  field: ModuleField | ModuleColumn
) {
  const key = field.key.toLowerCase();
  const label = field.label.toLowerCase();
  const format = "format" in field ? field.format : undefined;
  const type = "type" in field ? field.type : undefined;

  return (
    format === "file" ||
    type === "file" ||
    key.includes("attachment") ||
    key.includes("document") ||
    key.includes("proof") ||
    key.includes("file") ||
    label.includes("attachment") ||
    label.includes("document") ||
    label.includes("proof")
  );
}

export function isSystemRecordKey(key: string) {
  return SYSTEM_KEYS.has(key) || key.endsWith("_id");
}

export function isLongRecordField(key: string) {
  const normalized = key.toLowerCase();

  return [
    "description",
    "notes",
    "address",
    "reason",
    "summary",
    "content",
  ].some((keyword) => normalized.includes(keyword));
}
