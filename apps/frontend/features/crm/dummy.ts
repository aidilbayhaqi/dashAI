import type { ModuleData } from "@/types/modules";
import type { CRMModuleKey } from "./types";

export const crmDummyData: Record<CRMModuleKey, ModuleData> = {
  leads: {
    metrics: [
      {
        label: "Active Leads",
        value: "0",
        helper: "Total lead aktif dari CRM.",
      },
      {
        label: "Need Follow Up",
        value: "0",
        helper: "Lead yang perlu ditindaklanjuti.",
      },
      {
        label: "Converted",
        value: "0",
        helper: "Lead yang berhasil dikonversi.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data leads.",
      "Tambahkan lead baru untuk mulai tracking pipeline customer.",
    ],
  },

  contacts: {
    metrics: [
      {
        label: "Total Contacts",
        value: "0",
        helper: "Total kontak customer.",
      },
      {
        label: "Linked Leads",
        value: "0",
        helper: "Kontak yang sudah terhubung dengan lead.",
      },
      {
        label: "Active PIC",
        value: "0",
        helper: "PIC customer yang aktif.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data contacts.",
      "Tambahkan contact untuk menyimpan PIC customer.",
    ],
  },

  deals: {
    metrics: [
      {
        label: "Open Deals",
        value: "0",
        helper: "Deal yang masih berjalan.",
      },
      {
        label: "Won Deals",
        value: "0",
        helper: "Deal yang berhasil dimenangkan.",
      },
      {
        label: "Pipeline Value",
        value: "Rp 0",
        helper: "Estimasi nilai pipeline CRM.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data deals.",
      "Tambahkan deal untuk mulai tracking opportunity.",
    ],
  },

  activities: {
    metrics: [
      {
        label: "Total Activities",
        value: "0",
        helper: "Total aktivitas CRM.",
      },
      {
        label: "Planned",
        value: "0",
        helper: "Aktivitas yang masih direncanakan.",
      },
      {
        label: "Done",
        value: "0",
        helper: "Aktivitas yang sudah selesai.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data activities.",
      "Tambahkan activity untuk mencatat follow up customer.",
    ],
  },
};