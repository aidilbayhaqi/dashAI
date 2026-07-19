/**
 * Parse common Indonesian and international numeric input safely.
 *
 * Examples:
 * - 1.000       -> 1000
 * - 1.000,50    -> 1000.5
 * - 1,000.50    -> 1000.5
 * - 12,5        -> 12.5
 * - 12.5        -> 12.5
 */
export function parseLocalizedNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const original = String(value ?? "").trim();
  if (!original) return undefined;

  const negativeByParentheses = /^\(.*\)$/.test(original);
  const cleaned = original
    .replace(/^\(|\)$/g, "")
    .replace(/\b(?:Rp|IDR)\b/gi, "")
    .replace(/\s+/g, "")
    .replace(/[^\d.,+-]/g, "");

  if (!cleaned || !/\d/.test(cleaned)) return undefined;

  const sign = negativeByParentheses || cleaned.startsWith("-") ? -1 : 1;
  const unsigned = cleaned.replace(/[+-]/g, "");
  const commaCount = (unsigned.match(/,/g) ?? []).length;
  const dotCount = (unsigned.match(/\./g) ?? []).length;

  let normalized = unsigned;

  if (commaCount > 0 && dotCount > 0) {
    const decimalSeparator =
      unsigned.lastIndexOf(",") > unsigned.lastIndexOf(".") ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = unsigned
      .split(thousandsSeparator)
      .join("")
      .replace(decimalSeparator, ".");
  } else if (commaCount > 0) {
    const parts = unsigned.split(",");
    const last = parts.at(-1) ?? "";
    const looksLikeThousands =
      (commaCount > 1 && parts.slice(1).every((part) => part.length === 3))
      || (commaCount === 1 && last.length === 3 && parts[0] !== "0");

    normalized = looksLikeThousands
      ? parts.join("")
      : `${parts.slice(0, -1).join("")}.${last}`;
  } else if (dotCount > 0) {
    const parts = unsigned.split(".");
    const last = parts.at(-1) ?? "";
    const looksLikeThousands =
      (dotCount > 1 && parts.slice(1).every((part) => part.length === 3))
      || (dotCount === 1 && last.length === 3 && parts[0] !== "0");

    normalized = looksLikeThousands
      ? parts.join("")
      : `${parts.slice(0, -1).join("")}.${last}`;
  }

  const parsed = Number(normalized) * sign;
  return Number.isFinite(parsed) ? parsed : undefined;
}


/**
 * Parse values coming from HTML number inputs or backend Decimal strings.
 *
 * Unlike localized display parsing, a plain dot in a form value is always a
 * decimal separator. This prevents backend values such as `20.000` from being
 * interpreted as twenty-thousand when an edit form is submitted.
 */
export function parseFormNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return undefined;

  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return parseLocalizedNumber(value);
}

/** Convert Decimal API strings into compact values suitable for number inputs. */
export function formatNumberInputValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  const raw = String(value).trim();
  if (!raw) return "";

  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(parsed) : raw;
  }

  return raw;
}
