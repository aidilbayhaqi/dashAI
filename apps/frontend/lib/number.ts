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
