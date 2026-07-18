import { describe, expect, it } from "vitest";

import type { AIChatMessage, AIFinancialReportDraft } from "./types";
import {
  buildConversationHistory,
  buildFinancialReportTitle,
} from "./utils";

describe("AI report utilities", () => {
  it("uses an as-of title for balance sheets", () => {
    const draft: AIFinancialReportDraft = {
      report_type: "balance_sheet",
      start_date: "2026-07-01",
      end_date: "2026-07-18",
      report_date: "2026-07-18",
      beginning_cash_balance: "0.00",
      title: "",
    };

    expect(buildFinancialReportTitle(draft)).toBe("Neraca per 18/07/2026");
  });

  it("limits AI conversation context to the latest eight messages", () => {
    const messages: AIChatMessage[] = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      role: index % 2 ? "assistant" : "user",
      content: `message-${index}`,
      createdAt: "2026-07-18T00:00:00Z",
    }));

    const history = buildConversationHistory(messages);

    expect(history).toHaveLength(8);
    expect(history[0].content).toBe("message-2");
    expect(history[7].content).toBe("message-9");
  });
});
