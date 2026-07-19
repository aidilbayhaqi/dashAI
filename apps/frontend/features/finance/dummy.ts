import type { ModuleData } from "@/types/modules";
import type { FinanceModuleKey } from "./types";

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

export const financeDummyData: Record<FinanceModuleKey, ModuleData> = {
  overview: emptyModuleData({
    label: "Total Transactions",
    helper: "Belum ada ringkasan transaksi finance yang tercatat.",
    endpoint: "/api/v1/finance/transactions",
  }),

  "cash-accounts": emptyModuleData({
    label: "Total Cash Accounts",
    helper: "Belum ada cash account yang tercatat.",
    endpoint: "/api/v1/finance/cash-accounts",
  }),

  transactions: emptyModuleData({
    label: "Total Transactions",
    helper: "Belum ada transaksi finance yang tercatat.",
    endpoint: "/api/v1/finance/transactions",
  }),

  invoices: emptyModuleData({
    label: "Total Invoices",
    helper: "Belum ada invoice yang tercatat.",
    endpoint: "/api/v1/finance/invoices",
  }),

  cashflow: emptyModuleData({
    label: "Total Cashflow Snapshots",
    helper: "Belum ada cashflow snapshot yang tercatat.",
    endpoint: "/api/v1/finance/cashflow-snapshots",
  }),

  taxes: emptyModuleData({
    label: "Total Tax Records",
    helper: "Belum ada tax record yang tercatat.",
    endpoint: "/api/v1/finance/tax-records",
  }),

  ledger: emptyModuleData({
    label: "Total Journal Entries",
    helper: "Belum ada journal entry yang tercatat.",
    endpoint: "/api/v1/finance/journal-entries",
  }),
};