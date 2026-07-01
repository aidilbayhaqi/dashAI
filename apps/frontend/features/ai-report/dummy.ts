import type { ModuleData } from "@/types/modules";
import type { AIReportModuleKey } from "./types";

export const aiReportDummyData: Record<AIReportModuleKey, ModuleData> = {
  overview: {
    metrics: [
      { label: "Generated Reports", value: "27", helper: "12 insight minggu ini" },
      { label: "Critical Findings", value: "3", helper: "Butuh perhatian manajemen" },
      { label: "Automation Score", value: "82%", helper: "Readiness AI workflow" },
    ],
    rows: [
      {
        report: "Cashflow anomaly",
        module: "Finance",
        impact: "High",
        created: "Today",
        status: "Critical",
      },
      {
        report: "Low stock prediction",
        module: "Inventory",
        impact: "Medium",
        created: "Today",
        status: "Review",
      },
      {
        report: "Lead priority ranking",
        module: "CRM",
        impact: "High",
        created: "Yesterday",
        status: "Ready",
      },
    ],
    aiNotes: [
      "AI Report nanti akan terhubung ke backend endpoint `/api/v1/ai/reports`.",
      "Qdrant bisa dipakai untuk menyimpan context dokumen dan data reporting.",
      "Smart Reporting akan jadi pembeda utama DashAI dibanding ERP biasa.",
    ],
  },
};