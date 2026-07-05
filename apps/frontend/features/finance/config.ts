import {
  BadgeDollarSign,
  Banknote,
  Landmark,
  NotebookTabs,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import type { ModuleConfig, ModuleField } from "@/types/modules";
import type { FinanceModuleKey } from "./types";

const companyFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
];

const financeTransactionScopeFields: ModuleField[] = [
  ...companyFields,
  {
    key: "branch_id",
    label: "Branch",
    type: "select",
  },
  {
    key: "cash_account_id",
    label: "Cash Account",
    type: "select",
    required: true,
  },
];

const financeTransactionFormFields: ModuleField[] = [
  ...financeTransactionScopeFields,

  {
    key: "transaction_no",
    label: "Transaction No",
    placeholder: "TRX-2026-0001",
  },
  {
    key: "transaction_date",
    label: "Transaction Date",
    type: "date",
    required: true,
  },
  {
    key: "transaction_type",
    label: "Transaction Type",
    type: "select",
    required: true,
    options: [
      { label: "Income", value: "income" },
      { label: "Expense", value: "expense" },
      { label: "Adjustment", value: "adjustment" },
      { label: "Transfer", value: "transfer" },
    ],
  },
  {
    key: "cashflow_activity",
    label: "Cashflow Activity",
    type: "select",
    options: [
      { label: "Operating", value: "operating" },
      { label: "Investing", value: "investing" },
      { label: "Financing", value: "financing" },
    ],
  },
  {
    key: "category",
    label: "Category",
    placeholder: "Sales / Operational / Payroll",
  },
  {
    key: "counterparty_name",
    label: "Counterparty Name",
    placeholder: "Customer / Vendor / Partner",
  },
  {
    key: "reference_no",
    label: "Reference No",
    placeholder: "INV-2026-0001 / BILL-2026-0001",
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
  },
  {
    key: "subtotal_amount",
    label: "Subtotal Amount",
    type: "number",
  },
  {
    key: "discount_amount",
    label: "Discount Amount",
    type: "number",
  },
  {
    key: "tax_amount",
    label: "Tax Amount",
    type: "number",
  },
  {
    key: "amount",
    label: "Amount",
    type: "number",
    required: true,
  },
  {
    key: "total_amount",
    label: "Total Amount",
    type: "number",
    placeholder: "Kosongkan jika sama dengan amount",
  },
  {
    key: "payment_method",
    label: "Payment Method",
    type: "select",
    options: [
      { label: "Cash", value: "cash" },
      { label: "Bank Transfer", value: "bank_transfer" },
      { label: "E-Wallet", value: "e_wallet" },
      { label: "Credit Card", value: "credit_card" },
      { label: "Other", value: "other" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Posted", value: "posted" },
      { label: "Void", value: "void" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  {
    key: "attachment_url",
    label: "Attachment / Proof",
    type: "file",
  },
];

const invoiceFormFields: ModuleField[] = [
  ...companyFields,

  {
    key: "invoice_no",
    label: "Invoice No",
    placeholder: "INV-2026-0001",
  },
  {
    key: "customer_name",
    label: "Customer Name",
    required: true,
  },
  {
    key: "issue_date",
    label: "Issue Date",
    type: "date",
    required: true,
  },
  {
    key: "due_date",
    label: "Due Date",
    type: "date",
  },
  {
    key: "subtotal_amount",
    label: "Subtotal",
    type: "number",
  },
  {
    key: "discount_amount",
    label: "Discount",
    type: "number",
  },
  {
    key: "tax_amount",
    label: "Tax Amount",
    type: "number",
  },
  {
    key: "total_amount",
    label: "Total Amount",
    type: "number",
    required: true,
  },
  {
    key: "paid_amount",
    label: "Paid Amount",
    type: "number",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Sent", value: "sent" },
      { label: "Paid", value: "paid" },
      { label: "Overdue", value: "overdue" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
  {
    key: "attachment_url",
    label: "Invoice Attachment",
    type: "file",
  },
];

const cashflowFormFields: ModuleField[] = [
  ...companyFields,

  {
    key: "snapshot_date",
    label: "Snapshot Date",
    type: "date",
    required: true,
  },
  {
    key: "opening_balance",
    label: "Opening Balance",
    type: "number",
  },
  {
    key: "cash_in",
    label: "Cash In",
    type: "number",
  },
  {
    key: "cash_out",
    label: "Cash Out",
    type: "number",
  },
  {
    key: "closing_balance",
    label: "Closing Balance",
    type: "number",
  },
  {
    key: "net_cashflow",
    label: "Net Cashflow",
    type: "number",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Balanced", value: "balanced" },
      { label: "Review", value: "review" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

const taxFormFields: ModuleField[] = [
  ...companyFields,

  {
    key: "period",
    label: "Period",
    placeholder: "2026-07",
    required: true,
  },
  {
    key: "tax_type",
    label: "Tax Type",
    type: "select",
    required: true,
    options: [
      { label: "PPN", value: "ppn" },
      { label: "PPh 21", value: "pph_21" },
      { label: "PPh 23", value: "pph_23" },
      { label: "PPh Final", value: "pph_final" },
      { label: "Other", value: "other" },
    ],
  },
  {
    key: "tax_rate",
    label: "Tax Rate (%)",
    type: "number",
  },
  {
    key: "taxable_amount",
    label: "Taxable Amount",
    type: "number",
  },
  {
    key: "tax_amount",
    label: "Tax Amount",
    type: "number",
    required: true,
  },
  {
    key: "due_date",
    label: "Due Date",
    type: "date",
  },
  {
    key: "payment_date",
    label: "Payment Date",
    type: "date",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Pending", value: "pending" },
      { label: "Paid", value: "paid" },
      { label: "Overdue", value: "overdue" },
    ],
  },
  {
    key: "proof_url",
    label: "Tax Payment Proof",
    type: "file",
  },
];

const ledgerFormFields: ModuleField[] = [
  ...companyFields,

  {
    key: "journal_no",
    label: "Journal No",
    placeholder: "JRN-2026-0001",
  },
  {
    key: "entry_date",
    label: "Entry Date",
    type: "date",
    required: true,
  },
  {
    key: "cash_account_id",
    label: "Cash Account",
    type: "select",
  },
  {
    key: "account_code",
    label: "Account Code",
    placeholder: "1001",
  },
  {
    key: "account_name",
    label: "Account Name",
    required: true,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
  },
  {
    key: "debit_amount",
    label: "Debit",
    type: "number",
  },
  {
    key: "credit_amount",
    label: "Credit",
    type: "number",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Posted", value: "posted" },
      { label: "Balanced", value: "balanced" },
      { label: "Review", value: "review" },
    ],
  },
  {
    key: "attachment_url",
    label: "Journal Attachment",
    type: "file",
  },
];

export const financeModuleConfig: Record<FinanceModuleKey, ModuleConfig> = {
  overview: {
    badge: "Finance / Overview",
    title: "Finance Overview",
    description:
      "Pantau transaksi, invoice, cashflow, pajak, dan jurnal keuangan perusahaan.",
    icon: BadgeDollarSign,
    tableTitle: "Finance Transactions",
    tableDescription:
      "Ringkasan transaksi finance terbaru berdasarkan company scope.",
    columns: [
      { key: "date", label: "Date" },
      { key: "reference", label: "Reference" },
      { key: "account_name", label: "Account" },
      { key: "type", label: "Type" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
      { key: "attachment", label: "Attachment" },
    ],
    formFields: financeTransactionFormFields,
  },

  transactions: {
    badge: "Finance / Transactions",
    title: "Transactions",
    description:
      "Kelola pemasukan, pengeluaran, transfer, bukti pembayaran, dan status posting.",
    icon: Banknote,
    tableTitle: "Transaction Records",
    tableDescription:
      "Data transaksi finance dengan attachment bukti pembayaran.",
    columns: [
      { key: "date", label: "Date" },
      { key: "transaction_no", label: "Transaction No" },
      { key: "account_name", label: "Account" },
      { key: "type", label: "Type" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount" },
      { key: "total_amount", label: "Total" },
      { key: "payment_method", label: "Payment" },
      { key: "status", label: "Status" },
      { key: "attachment", label: "Attachment" },
    ],
    formFields: financeTransactionFormFields,
  },

  invoices: {
    badge: "Finance / Invoices",
    title: "Invoices",
    description:
      "Kelola invoice pelanggan, total tagihan, status pembayaran, dan lampiran invoice.",
    icon: ReceiptText,
    tableTitle: "Invoice Records",
    tableDescription:
      "Pantau invoice draft, sent, paid, overdue, dan outstanding amount.",
    columns: [
      { key: "invoice_no", label: "Invoice No" },
      { key: "customer", label: "Customer" },
      { key: "issue_date", label: "Issue Date" },
      { key: "due_date", label: "Due Date" },
      { key: "total", label: "Total" },
      { key: "paid", label: "Paid" },
      { key: "outstanding", label: "Outstanding" },
      { key: "status", label: "Status" },
    ],
    formFields: invoiceFormFields,
  },

  cashflow: {
    badge: "Finance / Cashflow",
    title: "Cashflow",
    description:
      "Catat snapshot arus kas, opening balance, cash in, cash out, dan closing balance.",
    icon: WalletCards,
    tableTitle: "Cashflow Snapshots",
    tableDescription:
      "Monitoring kas masuk, kas keluar, dan saldo akhir per periode.",
    columns: [
      { key: "snapshot_date", label: "Date" },
      { key: "opening", label: "Opening" },
      { key: "cash_in", label: "Cash In" },
      { key: "cash_out", label: "Cash Out" },
      { key: "closing", label: "Closing" },
      { key: "net", label: "Net" },
      { key: "status", label: "Status" },
    ],
    formFields: cashflowFormFields,
  },

  taxes: {
    badge: "Finance / Taxes",
    title: "Taxes",
    description:
      "Kelola PPN, PPh, taxable amount, nominal pajak, due date, dan bukti pembayaran.",
    icon: Landmark,
    tableTitle: "Tax Records",
    tableDescription:
      "Data pajak perusahaan berdasarkan periode, tipe pajak, dan status pembayaran.",
    columns: [
      { key: "period", label: "Period" },
      { key: "tax_type", label: "Tax Type" },
      { key: "taxable", label: "Taxable" },
      { key: "tax_amount", label: "Tax Amount" },
      { key: "due_date", label: "Due Date" },
      { key: "status", label: "Status" },
      { key: "proof", label: "Proof" },
    ],
    formFields: taxFormFields,
  },

  ledger: {
    badge: "Finance / Ledger",
    title: "Ledger",
    description:
      "Kelola journal entry, akun debit/kredit, status posting, dan attachment jurnal.",
    icon: NotebookTabs,
    tableTitle: "Journal Entries",
    tableDescription:
      "Daftar jurnal keuangan untuk general ledger dan pembukuan dasar.",
    columns: [
      { key: "journal_no", label: "Journal No" },
      { key: "entry_date", label: "Entry Date" },
      { key: "account", label: "Account" },
      { key: "debit", label: "Debit" },
      { key: "credit", label: "Credit" },
      { key: "status", label: "Status" },
      { key: "attachment", label: "Attachment" },
    ],
    formFields: ledgerFormFields,
  },
};