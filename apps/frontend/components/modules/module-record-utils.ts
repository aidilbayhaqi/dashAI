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
  "order_no",
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

const ACTIVITY_KEYS = new Set([
  "created_at",
  "updated_at",
  "deleted_at",
  "posted_at",
  "approved_at",
  "fulfilled_at",
  "paid_at",
  "processed_at",
]);

const TECHNICAL_KEYS = new Set([
  "id",
  "company_id",
  "branch_id",
  "created_by_id",
  "updated_by_id",
  "deleted_by_id",
  "created_by",
  "approved_by",
  "source_id",
  "aggregate_id",
  "event_key",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function formatRecordFieldLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isUuidRecordValue(value: unknown) {
  return UUID_PATTERN.test(String(value ?? "").trim());
}

export function isTechnicalRecordKey(key: string) {
  const normalized = key.toLowerCase();

  return (
    TECHNICAL_KEYS.has(normalized) ||
    normalized.endsWith("_id") ||
    normalized.endsWith("_uuid") ||
    normalized === "uuid"
  );
}

export function shouldHideRecordField(key: string, value: unknown) {
  return isTechnicalRecordKey(key) || isUuidRecordValue(value);
}

export function getRecordTitle(row: ModuleRow | null | undefined) {
  if (!row) return "Record";

  for (const key of TITLE_KEYS) {
    const value = String(row[key] ?? "").trim();
    if (value && !isUuidRecordValue(value)) return value;
  }

  return "Record";
}

export function getRecordSubtitle(row: ModuleRow | null | undefined) {
  if (!row) return "";

  for (const key of SUBTITLE_KEYS) {
    const value = String(row[key] ?? "").trim();
    if (
      value &&
      value !== getRecordTitle(row) &&
      !isUuidRecordValue(value)
    ) {
      return value;
    }
  }

  return "Informasi record terbaru";
}

export function getRecordStatus(row: ModuleRow | null | undefined) {
  if (!row) return "";

  const preferredKeys = [
    "payment_status",
    "invoice_status",
    "transaction_status",
    "stock_status",
    "approval_status",
    "employment_status",
    "is_paid_label",
    "is_active_label",
    "status_label",
    "status",
  ];

  for (const key of preferredKeys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }

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
      "fulfilled",
      "done",
      "ready",
      "balanced",
      "positive",
      "posted",
      "processed",
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
      "partial",
      "unpaid",
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
    (type === "file" &&
      (key.includes("image") ||
        key.includes("photo") ||
        key.includes("avatar") ||
        key.includes("logo"))) ||
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
  return ACTIVITY_KEYS.has(key.toLowerCase());
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
