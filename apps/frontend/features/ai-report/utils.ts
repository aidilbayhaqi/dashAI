import type {
  AIAgentConversationMessage,
  AIFinancialReportDraft,
  AIChatMessage,
} from "./types";

export function formatRupiah(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDateId(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function buildFinancialReportTitle(draft: AIFinancialReportDraft) {
  if (draft.report_type === "balance_sheet") {
    return `Neraca per ${formatDateId(draft.report_date)}`;
  }
  const label = draft.report_type === "profit_loss"
    ? "Laporan Laba Rugi"
    : "Laporan Arus Kas";
  return `${label} ${formatDateId(draft.start_date)} - ${formatDateId(draft.end_date)}`;
}

export function buildConversationHistory(
  messages: AIChatMessage[],
): AIAgentConversationMessage[] {
  return messages.slice(-8).map(({ role, content }) => ({ role, content }));
}
