import type { ModuleData } from "@/types/modules";
import type { FinanceModuleKey } from "./types";

export const financeDummyData: Record<FinanceModuleKey, ModuleData> = {
  overview: {
    metrics: [
      {
        label: "Monthly Revenue",
        value: "Rp 128.5 M",
        helper: "+18.2% dibanding bulan lalu",
        trend: "+18.2%",
      },
      {
        label: "Pending Invoice",
        value: "32",
        helper: "Menunggu pembayaran",
      },
      {
        label: "Cashflow",
        value: "+Rp 42.7 M",
        helper: "Positif dalam periode berjalan",
      },
    ],
    rows: [
      {
        transaction: "Enterprise ERP Payment",
        type: "Income",
        amount: "Rp 48.000.000",
        date: "01 Jul 2026",
        status: "Paid",
      },
      {
        transaction: "Cloud Infrastructure",
        type: "Expense",
        amount: "Rp 8.500.000",
        date: "30 Jun 2026",
        status: "Approved",
      },
      {
        transaction: "Vendor Invoice",
        type: "Expense",
        amount: "Rp 12.200.000",
        date: "29 Jun 2026",
        status: "Pending",
      },
    ],
    aiNotes: [
      "Cashflow masih positif, namun expense infrastruktur meningkat.",
      "Invoice enterprise menjadi kontributor revenue terbesar bulan ini.",
      "Perlu follow-up invoice pending agar DSO tetap sehat.",
    ],
  },

  transactions: {
    metrics: [
      { label: "Transactions", value: "1,284", helper: "Bulan berjalan" },
      { label: "Income", value: "Rp 128.5 M", helper: "Total pemasukan" },
      { label: "Expense", value: "Rp 85.8 M", helper: "Total pengeluaran" },
    ],
    rows: [
      {
        code: "TRX-1001",
        description: "Client subscription",
        amount: "Rp 24.000.000",
        category: "Revenue",
        status: "Completed",
      },
      {
        code: "TRX-1002",
        description: "Server payment",
        amount: "Rp 6.500.000",
        category: "Infrastructure",
        status: "Approved",
      },
      {
        code: "TRX-1003",
        description: "Marketing campaign",
        amount: "Rp 10.000.000",
        category: "Marketing",
        status: "Review",
      },
    ],
    aiNotes: [
      "Marketing expense perlu dibandingkan dengan pipeline CRM.",
      "Transaksi subscription stabil dan bisa dijadikan baseline forecasting.",
      "Kategori expense perlu distandarkan untuk reporting finance.",
    ],
  },

  invoices: {
    metrics: [
      { label: "Total Invoice", value: "86", helper: "Bulan berjalan" },
      { label: "Paid", value: "54", helper: "Sudah dibayar" },
      { label: "Overdue", value: "6", helper: "Butuh follow-up" },
    ],
    rows: [
      {
        invoice: "INV-2026-001",
        client: "PT Nusantara Retail",
        amount: "Rp 32.000.000",
        due: "08 Jul 2026",
        status: "Paid",
      },
      {
        invoice: "INV-2026-002",
        client: "CV Prima Jaya",
        amount: "Rp 18.500.000",
        due: "11 Jul 2026",
        status: "Pending",
      },
      {
        invoice: "INV-2026-003",
        client: "PT Global Mandiri",
        amount: "Rp 42.000.000",
        due: "28 Jun 2026",
        status: "Overdue",
      },
    ],
    aiNotes: [
      "Invoice overdue perlu diprioritaskan agar cashflow tidak terganggu.",
      "Client enterprise memiliki invoice value tertinggi bulan ini.",
      "Aging receivable bisa menjadi indikator kesehatan cashflow.",
    ],
  },

  cashflow: {
    metrics: [
      { label: "Net Cashflow", value: "+Rp 42.7 M", helper: "Periode berjalan" },
      { label: "Cash In", value: "Rp 128.5 M", helper: "Total inflow" },
      { label: "Cash Out", value: "Rp 85.8 M", helper: "Total outflow" },
    ],
    rows: [
      {
        period: "Week 1",
        cashIn: "Rp 32.5 M",
        cashOut: "Rp 18.4 M",
        net: "+Rp 14.1 M",
        status: "Positive",
      },
      {
        period: "Week 2",
        cashIn: "Rp 28.2 M",
        cashOut: "Rp 21.0 M",
        net: "+Rp 7.2 M",
        status: "Positive",
      },
      {
        period: "Week 3",
        cashIn: "Rp 20.0 M",
        cashOut: "Rp 24.5 M",
        net: "-Rp 4.5 M",
        status: "Risk",
      },
    ],
    aiNotes: [
      "Week 3 menunjukkan cashflow negatif, perlu cek expense besar.",
      "Forecast cashflow masih aman jika invoice pending dibayar tepat waktu.",
      "Cashflow bisa dihubungkan dengan invoice dan transaction module.",
    ],
  },

  taxes: {
    metrics: [
      { label: "Tax Payable", value: "Rp 14.2 M", helper: "Estimasi bulan ini" },
      { label: "PPN Output", value: "Rp 9.7 M", helper: "Dari invoice penjualan" },
      { label: "Due Soon", value: "3 Days", helper: "Deadline pelaporan" },
    ],
    rows: [
      {
        type: "PPN",
        period: "Jun 2026",
        amount: "Rp 9.700.000",
        due: "05 Jul 2026",
        status: "Review",
      },
      {
        type: "PPh 23",
        period: "Jun 2026",
        amount: "Rp 2.400.000",
        due: "10 Jul 2026",
        status: "Ready",
      },
      {
        type: "PPh 21",
        period: "Jun 2026",
        amount: "Rp 2.100.000",
        due: "10 Jul 2026",
        status: "Pending",
      },
    ],
    aiNotes: [
      "PPN perlu direview sebelum deadline agar tidak terlambat submit.",
      "PPh payroll bisa dihubungkan dengan modul HR Payroll nanti.",
      "Tax reminder wajib muncul di dashboard executive.",
    ],
  },

  ledger: {
    metrics: [
      { label: "Journal Entries", value: "284", helper: "Bulan berjalan" },
      { label: "Balanced", value: "278", helper: "Entry sudah balance" },
      { label: "Need Review", value: "6", helper: "Entry perlu validasi" },
    ],
    rows: [
      {
        account: "Cash",
        debit: "Rp 24.000.000",
        credit: "-",
        period: "Jun 2026",
        status: "Balanced",
      },
      {
        account: "Revenue",
        debit: "-",
        credit: "Rp 24.000.000",
        period: "Jun 2026",
        status: "Balanced",
      },
      {
        account: "Marketing Expense",
        debit: "Rp 10.000.000",
        credit: "-",
        period: "Jun 2026",
        status: "Review",
      },
    ],
    aiNotes: [
      "Beberapa jurnal expense perlu validasi kategori.",
      "Ledger bisa dijadikan source utama untuk AI financial reporting.",
      "Nantinya ledger harus punya audit trail yang kuat.",
    ],
  },
};