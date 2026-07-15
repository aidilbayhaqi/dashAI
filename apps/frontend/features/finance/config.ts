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
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

const cashflowFormFields: ModuleField[] = [
  ...companyFields,
  { key: "period_id", label: "Accounting Period", type: "select" },
  { key: "start_date", label: "Start Date", type: "date", required: true },
  { key: "end_date", label: "End Date", type: "date", required: true },
  { key: "report_date", label: "Report Date", type: "date", required: true },
  {
    key: "beginning_cash_balance",
    label: "Beginning Cash Balance",
    type: "number",
    required: true,
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
    key: "due_date",
    label: "Due Date",
    type: "date",
  },
  {
    key: "reference_no",
    label: "Reference No",
    placeholder: "SSP / e-Billing / Bukti setor",
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
      { key: "date", label: "Date", className: "w-[130px] min-w-[130px] whitespace-nowrap" },
      { key: "transaction_no", label: "Transaction", className: "w-[190px] min-w-[190px] whitespace-nowrap" },
      { key: "counterparty", label: "Counterparty", className: "w-[210px] min-w-[210px] max-w-[210px]" },
      { key: "account_name", label: "Cash Account", className: "w-[210px] min-w-[210px] max-w-[210px]" },
      { key: "type_label", label: "Type", className: "w-[135px] min-w-[135px] whitespace-nowrap" },
      { key: "amount", label: "Amount", format: "currency", className: "w-[170px] min-w-[170px] whitespace-nowrap text-right" },
      { key: "status_label", label: "Status", className: "w-[130px] min-w-[130px] whitespace-nowrap" },
    ],
    formFields: financeTransactionFormFields,
    detailFields: financeTransactionFormFields,
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
      { key: "invoice_no", label: "Invoice", className: "min-w-[145px]" },
      { key: "client_name", label: "Client", className: "min-w-[150px]" },
      { key: "invoice_date_display", label: "Issued", className: "min-w-[110px]" },
      { key: "due_date_display", label: "Due", className: "min-w-[110px]" },
      { key: "total", label: "Total", format: "currency", className: "min-w-[130px]" },
      { key: "outstanding", label: "Outstanding", format: "currency", className: "min-w-[140px]" },
      { key: "status_label", label: "Status", className: "min-w-[110px]" },
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
      { key: "report_date_display", label: "Date", className: "min-w-[110px]" },
      { key: "beginning_cash_balance_display", label: "Beginning", format: "currency", className: "min-w-[135px]" },
      { key: "total_cash_in_display", label: "Cash In", format: "currency", className: "min-w-[125px]" },
      { key: "total_cash_out_display", label: "Cash Out", format: "currency", className: "min-w-[125px]" },
      { key: "net_cashflow_display", label: "Net", format: "currency", className: "min-w-[125px]" },
      { key: "ending_cash_balance_display", label: "Ending", format: "currency", className: "min-w-[135px]" },
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
      { key: "tax_period", label: "Period", className: "min-w-[105px]" },
      { key: "tax_type_label", label: "Tax Type", className: "min-w-[115px]" },
      { key: "taxable", label: "Taxable", format: "currency", className: "min-w-[130px]" },
      { key: "tax_amount_display", label: "Tax", format: "currency", className: "min-w-[125px]" },
      { key: "due_date_display", label: "Due", className: "min-w-[110px]" },
      { key: "status_label", label: "Status", className: "min-w-[110px]" },
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
      { key: "journal_no", label: "Journal", className: "min-w-[145px]" },
      { key: "journal_date_display", label: "Date", className: "min-w-[110px]" },
      { key: "total_debit_display", label: "Debit", format: "currency", className: "min-w-[130px]" },
      { key: "total_credit_display", label: "Credit", format: "currency", className: "min-w-[130px]" },
      { key: "is_balanced_display", label: "Balanced", className: "min-w-[105px]" },
      { key: "status_label", label: "Status", className: "min-w-[110px]" },
    ],
    formFields: ledgerFormFields,
  },
};