import {
  ChartNoAxesCombined,
  FileText,
  Landmark,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { ModuleConfig } from "@/types/modules";
import type { FinanceModuleKey } from "./types";

export const financeModuleConfig: Record<FinanceModuleKey, ModuleConfig> = {
  overview: {
    badge: "Finance / Accounting",
    title: "Finance Overview",
    description:
      "Pantau revenue, expense, invoice, cashflow, pajak, approval, dan general ledger perusahaan.",
    icon: Wallet,
    columns: [
      { key: "transaction", label: "Transaction" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ],
  },

  transactions: {
    badge: "Finance / Transactions",
    title: "Transactions",
    description:
      "Kelola pemasukan, pengeluaran, approval transaksi, dan histori finance.",
    icon: ReceiptText,
    columns: [
      { key: "code", label: "Code" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
    ],
  },

  invoices: {
    badge: "Finance / Invoices",
    title: "Invoices",
    description:
      "Monitor invoice, due date, payment status, dan aging receivable.",
    icon: FileText,
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "client", label: "Client" },
      { key: "amount", label: "Amount" },
      { key: "due", label: "Due Date" },
      { key: "status", label: "Status" },
    ],
  },

  cashflow: {
    badge: "Finance / Cashflow",
    title: "Cashflow",
    description: "Pantau arus kas masuk dan keluar agar bisnis tetap sehat.",
    icon: TrendingUp,
    columns: [
      { key: "period", label: "Period" },
      { key: "cashIn", label: "Cash In" },
      { key: "cashOut", label: "Cash Out" },
      { key: "net", label: "Net" },
      { key: "status", label: "Status" },
    ],
  },

  taxes: {
    badge: "Finance / Taxes",
    title: "Taxes",
    description: "Kelola PPN, PPh, tax report, dan compliance keuangan.",
    icon: Landmark,
    columns: [
      { key: "type", label: "Tax Type" },
      { key: "period", label: "Period" },
      { key: "amount", label: "Amount" },
      { key: "due", label: "Due" },
      { key: "status", label: "Status" },
    ],
  },

  ledger: {
    badge: "Finance / General Ledger",
    title: "General Ledger",
    description:
      "Pantau jurnal umum, akun, debit, kredit, dan balance accounting.",
    icon: ChartNoAxesCombined,
    columns: [
      { key: "account", label: "Account" },
      { key: "debit", label: "Debit" },
      { key: "credit", label: "Credit" },
      { key: "period", label: "Period" },
      { key: "status", label: "Status" },
    ],
  },
};