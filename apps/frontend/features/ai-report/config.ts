import { BrainCircuit } from "lucide-react";
import type { ModuleConfig } from "@/types/modules";
import type { AIReportModuleKey } from "./types";

export const aiReportModuleConfig: Record<AIReportModuleKey, ModuleConfig> = {
  overview: {
    badge: "Intelligence / Smart Reporting",
    title: "AI Business Intelligence",
    description:
      "Generate insight otomatis dari data ERP: finance, inventory, HR, CRM, dan KPI perusahaan.",
    icon: BrainCircuit,
    columns: [
      { key: "report", label: "Report" },
      { key: "module", label: "Module" },
      { key: "impact", label: "Impact" },
      { key: "created", label: "Created" },
      { key: "status", label: "Status" },
    ],
  },
};