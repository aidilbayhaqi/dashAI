import {
  Activity,
  BadgeDollarSign,
  Banknote,
  Landmark,
  NotebookTabs,
  ReceiptText,
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

const transactionStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Posted", value: "posted" },
  { label: "Void", value: "void" },
  { label: "Cancelled", value: "cancelled" },
];

const invoiceStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partially Paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

const taxStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Accrued", value: "accrued" },
  { label: "Paid", value: "paid" },
  { label: "Reported", value: "reported" },
  { label: "Cancelled", value: "cancelled" },
];

const journalStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Posted", value: "posted" },
  { label: "Reversed", value: "reversed" },
];

const financeTransactionFormFields: ModuleField[] = [
  ...companyFields,
  {
    key: "cash_account_id",
    label: "Cash Account",
    type: "select",
  },
  {
    key: "transaction_no",
    label: "Transaction No",
    placeholder: "TRX-2026-0001",
    required: true,
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
      { label: "Transfer", value: "transfer" },
      { label: "Tax Payment", value: "tax_payment" },
      { label: "Refund", value: "refund" },
      { label: "Adjustment", value: "adjustment" },
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
    key: "total_amount",
    label: "Total Amount",
    type: "number",
    required: true,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: transactionStatusOptions,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
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
    required: true,
  },
  {
    key: "client_name",
    label: "Client Name",
    required: true,
  },
  {
    key: "invoice_date",
    label: "Invoice Date",
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
    options: invoiceStatusOptions,
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

const cashflowFormFields: ModuleField[] = [
  ...companyFields,
  {
    key: "period_id",
    label: "Accounting Period",
    type: "select",
  },
  {
    key: "report_date",
    label: "Report Date",
    type: "date",
    required: true,
  },
  {
    key: "beginning_cash_balance",
    label: "Beginning Cash Balance",
    type: "number",
    required: true,
  },
  {
    key: "operating_cash_in",
    label: "Operating Cash In",
    type: "number",
  },
  {
    key: "operating_cash_out",
    label: "Operating Cash Out",
    type: "number",
  },
  {
    key: "investing_cash_in",
    label: "Investing Cash In",
    type: "number",
  },
  {
    key: "investing_cash_out",
    label: "Investing Cash Out",
    type: "number",
  },
  {
    key: "financing_cash_in",
    label: "Financing Cash In",
    type: "number",
  },
  {
    key: "financing_cash_out",
    label: "Financing Cash Out",
    type: "number",
  },
  {
    key: "net_cashflow",
    label: "Net Cashflow",
    type: "number",
  },
  {
    key: "ending_cash_balance",
    label: "Ending Cash Balance",
    type: "number",
  },
];

const taxFormFields: ModuleField[] = [
  ...companyFields,
  {
    key: "tax_period",
    label: "Tax Period",
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
      { label: "PPh 22", value: "pph_22" },
      { label: "PPh 23", value: "pph_23" },
      { label: "PPh 25", value: "pph_25" },
      { label: "PPh Final", value: "pph_final" },
      { label: "Other", value: "other" },
    ],
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
    key: "paid_amount",
    label: "Paid Amount",
    type: "number",
  },
  {
    key: "due_date",
    label: "Due Date",
    type: "date",
  },
  {
    key: "paid_date",
    label: "Paid Date",
    type: "date",
  },
  {
    key: "reported_date",
    label: "Reported Date",
    type: "date",
  },
  {
    key: "reference_no",
    label: "Reference No",
    placeholder: "SSP / e-Billing / Bukti setor",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: taxStatusOptions,
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

const ledgerFormFields: ModuleField[] = [
  ...companyFields,
  {
    key: "journal_no",
    label: "Journal No",
    placeholder: "JRN-2026-0001",
    required: true,
  },
  {
    key: "journal_date",
    label: "Journal Date",
    type: "date",
    required: true,
  },
  {
    key: "total_debit",
    label: "Total Debit",
    type: "number",
  },
  {
    key: "total_credit",
    label: "Total Credit",
    type: "number",
  },
  {
    key: "is_balanced",
    label: "Balanced?",
    type: "select",
    options: [
      { label: "No", value: "false" },
      { label: "Yes", value: "true" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: journalStatusOptions,
  },
  {
    key: "memo",
    label: "Memo",
    type: "textarea",
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
      "Ringkasan transaksi finance terbaru berdasarkan company scope dan data API backend.",
    columns: [
      { key: "date", label: "Date" },
      { key: "transaction_no", label: "Transaction No" },
      { key: "account_name", label: "Cash Account" },
      { key: "type_label", label: "Type" },
      { key: "creation_mode_label", label: "Source" },
      { key: "cashflow_activity_label", label: "Activity" },
      { key: "amount", label: "Amount", format: "currency" },
      { key: "status_label", label: "Status" },
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
      "Data transaksi finance yang sudah disesuaikan dengan model FinanceTransaction backend.",
    columns: [
      { key: "date", label: "Date" },
      { key: "transaction_no", label: "Transaction No" },
      { key: "account_name", label: "Cash Account" },
      { key: "counterparty", label: "Counterparty" },
      { key: "type_label", label: "Type" },
      { key: "cashflow_activity_label", label: "Activity" },
      { key: "amount", label: "Amount", format: "currency" },
      { key: "status_label", label: "Status" },
      { key: "attachment", label: "Attachment" },
    ],
    formFields: financeTransactionFormFields,
  },

  invoices: {
    badge: "Finance / Invoices",
    title: "Invoices",
    description:
      "Kelola invoice pelanggan, total tagihan, status pembayaran, dan outstanding amount.",
    icon: ReceiptText,
    tableTitle: "Invoice Records",
    tableDescription:
      "Data invoice langsung dari endpoint /finance/invoices, bukan disaring dari transactions.",
    columns: [
      { key: "invoice_no", label: "Invoice No" },
      { key: "creation_mode_label", label: "Source" },
      { key: "client_name", label: "Client" },
      { key: "invoice_date_display", label: "Invoice Date" },
      { key: "due_date_display", label: "Due Date" },
      { key: "total", label: "Total", format: "currency" },
      { key: "paid", label: "Paid", format: "currency" },
      { key: "outstanding", label: "Outstanding", format: "currency" },
      { key: "status_label", label: "Status" },
    ],
    formFields: invoiceFormFields,
  },

  cashflow: {
    badge: "Finance / Cashflow",
    title: "Cashflow",
    description:
      "Pantau snapshot arus kas berdasarkan saldo awal, operating cash, investing cash, financing cash, net cashflow, dan saldo akhir.",
    icon: Activity,
    tableTitle: "Cashflow Snapshot Records",
    tableDescription:
      "Data cashflow dibaca langsung dari field backend finance_cashflow_snapshots.",
    columns: [
  { key: "report_date_display", label: "Date" },
  { key: "beginning_cash_balance_display", label: "Beginning Cash", format: "currency" },
  { key: "operating_cash_in_display", label: "Operating In", format: "currency" },
  { key: "operating_cash_out_display", label: "Operating Out", format: "currency" },
  { key: "investing_cash_in_display", label: "Investing In", format: "currency" },
  { key: "investing_cash_out_display", label: "Investing Out", format: "currency" },
  { key: "financing_cash_in_display", label: "Financing In", format: "currency" },
  { key: "financing_cash_out_display", label: "Financing Out", format: "currency" },
  { key: "net_cashflow_display", label: "Net Cashflow", format: "currency" },
  { key: "ending_cash_balance_display", label: "Ending Cash", format: "currency" },
],
    formFields: cashflowFormFields,
  },

  taxes: {
    badge: "Finance / Taxes",
    title: "Taxes",
    description:
      "Kelola PPN, PPh, taxable amount, nominal pajak, due date, dan status pelaporan.",
    icon: Landmark,
    tableTitle: "Tax Records",
    tableDescription:
      "Data pajak perusahaan berdasarkan tax_period, tax_type, dan status backend yang valid.",
    columns: [
      { key: "tax_period", label: "Period" },
      { key: "tax_type_label", label: "Tax Type" },
      { key: "taxable", label: "Taxable", format: "currency" },
      { key: "tax_amount_display", label: "Tax Amount", format: "currency" },
      { key: "paid_amount_display", label: "Paid", format: "currency" },
      { key: "due_date_display", label: "Due Date" },
      { key: "status_label", label: "Status" },
    ],
    formFields: taxFormFields,
  },

  ledger: {
    badge: "Finance / Ledger",
    title: "Ledger",
    description:
      "Kelola journal entry, total debit/kredit, status posting, dan memo jurnal.",
    icon: NotebookTabs,
    tableTitle: "Journal Entries",
    tableDescription:
      "Daftar jurnal keuangan sesuai model FinanceJournalEntry backend.",
    columns: [
      { key: "journal_no", label: "Journal No" },
      { key: "journal_date_display", label: "Journal Date" },
      { key: "total_debit_display", label: "Debit", format: "currency" },
      { key: "total_credit_display", label: "Credit", format: "currency" },
      { key: "is_balanced_display", label: "Balanced" },
      { key: "status_label", label: "Status" },
    ],
    formFields: ledgerFormFields,
  },
};