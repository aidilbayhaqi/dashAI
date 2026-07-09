import type { ModuleColumn } from "@/types/modules";

const CURRENCY_KEYS = new Set([
  "cost_price",
  "selling_price",
  "price",
  "unit_price",
  "subtotal_amount",
  "discount_amount",
  "tax_amount",
  "total_amount",
  "paid_amount",
  "amount",
  "opening_balance",
  "current_balance",
  "base_salary",
  "salary",
  "allowance_amount",
  "bonus_amount",
  "overtime_amount",
  "deduction_amount",
  "net_pay",
  "total_gross",
  "total_deduction",
  "total_deductions",
  "total_tax",
  "total_net",
  "budget_amount",
  "actual_amount",
  "variance_amount",
  "total_budget_amount",
  "revenue_amount",
  "cogs_amount",
  "gross_profit_amount",
  "operating_cash_in",
  "operating_cash_out",
  "investing_cash_in",
  "investing_cash_out",
  "financing_cash_in",
  "financing_cash_out",
  "net_cashflow",
  "closing_balance",
  "total_assets",
  "total_liabilities",
  "total_equity",
  "retained_earnings",
]);

const INTEGER_KEYS = new Set([
  "stock",
  "quantity_on_hand",
  "reserved_quantity",
  "reorder_point",
  "quantity",
  "work_minutes",
  "overtime_minutes",
  "lead_time_days",
  "lead_time",
  "fiscal_year",
  "period_number",
  "year",
]);

const DECIMAL_KEYS = new Set([
  "total_days",
  "default_days_per_year",
  "entitled_days",
  "used_days",
  "remaining_days",
  "total_score",
  "score",
  "weighted_score",
  "completion_score",
  "target_value",
  "actual_value",
]);

const PERCENT_KEYS = new Set([
  "rate_percent",
  "weight_percent",
  "probability_percent",
  "variance_percent",
  "gross_margin_percent",
  "net_margin_percent",
  "margin_percent",
]);

const RATING_KEYS = new Set(["rating", "grade"]);

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (!hasValue(value)) return null;

  const text = String(value).trim();
  const cleaned = text
    .replace(/Rp/gi, "")
    .replace(/IDR/gi, "")
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "");

  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replaceAll(".", "").replace(",", ".")
        : cleaned.replaceAll(",", "");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    normalized =
      parts.length === 2 && parts[1].length <= 4
        ? cleaned.replace(",", ".")
        : cleaned.replaceAll(",", "");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    normalized =
      parts.length === 2 && parts[1].length <= 4
        ? cleaned
        : cleaned.replaceAll(".", "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferFormat(column: ModuleColumn): ModuleColumn["format"] {
  const key = column.key.toLowerCase();

  if (RATING_KEYS.has(key)) return "rating";
  if (PERCENT_KEYS.has(key)) return "percent";
  if (CURRENCY_KEYS.has(key)) return "currency";
  if (INTEGER_KEYS.has(key)) return "number";
  if (DECIMAL_KEYS.has(key)) return "decimal";

  if (key.endsWith("_date") || key.endsWith("_date_display")) {
    return "date";
  }

  return "text";
}

function alreadyFormattedCurrency(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return /^(Rp|IDR)\s?/i.test(text);
}

function formatDate(value: unknown): string {
  if (!hasValue(value)) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatModuleValue(
  value: unknown,
  column: ModuleColumn
): string {
  if (!hasValue(value)) return "-";

  const format = column.format ?? inferFormat(column);
  const text = String(value);

  if (format === "text" || format === "file" || format === "image") {
    return text;
  }

  if (format === "rating") {
    return text.trim().toUpperCase();
  }

  if (format === "date") {
    return formatDate(value);
  }

  if (format === "datetime") {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  const numericValue = parseNumber(value);
  if (numericValue === null) return text;

  if (format === "currency") {
    if (alreadyFormattedCurrency(value)) return text;

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: column.currency ?? "IDR",
      minimumFractionDigits: column.minimumFractionDigits ?? 0,
      maximumFractionDigits: column.maximumFractionDigits ?? 0,
    }).format(numericValue);
  }

  if (format === "percent") {
    return `${new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: column.minimumFractionDigits ?? 0,
      maximumFractionDigits: column.maximumFractionDigits ?? 2,
    }).format(numericValue)}%`;
  }

  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits:
      column.minimumFractionDigits ?? (format === "decimal" ? 0 : 0),
    maximumFractionDigits:
      column.maximumFractionDigits ?? (format === "decimal" ? 4 : 4),
  }).format(numericValue);

  return column.unit ? `${formatted} ${column.unit}` : formatted;
}
