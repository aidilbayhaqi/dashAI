import type { ModuleData } from "@/types/modules";
import type { CRMModuleKey } from "./types";

function emptyModuleData({
  label,
  helper,
  endpoint,
}: {
  label: string;
  helper: string;
  endpoint: string;
}): ModuleData {
  return {
    metrics: [
      {
        label,
        value: "0",
        helper,
        trend: "Empty",
      },
    ],
    rows: [],
    aiNotes: [
      `Data akan dibaca dari API ${endpoint}.`,
      "Dummy data ini hanya fallback agar UI tetap aman saat API belum tersedia.",
    ],
  };
}

export const crmDummyData: Record<CRMModuleKey, ModuleData> = {
  leads: emptyModuleData({
    label: "Total Leads",
    helper: "Belum ada lead yang tercatat.",
    endpoint: "/api/v1/crm/leads",
  }),

  contacts: emptyModuleData({
    label: "Total Contacts",
    helper: "Belum ada contact yang tercatat.",
    endpoint: "/api/v1/crm/contacts",
  }),

  deals: emptyModuleData({
    label: "Total Deals",
    helper: "Belum ada deal/pipeline yang tercatat.",
    endpoint: "/api/v1/crm/deals",
  }),

  activities: emptyModuleData({
    label: "Total Activities",
    helper: "Belum ada activity CRM yang tercatat.",
    endpoint: "/api/v1/crm/activities",
  }),

  campaigns: emptyModuleData({
    label: "Total Campaigns",
    helper: "Belum ada campaign yang tercatat.",
    endpoint: "/api/v1/crm/campaigns",
  }),
};