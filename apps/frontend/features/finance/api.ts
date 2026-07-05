import { api } from "@/lib/api";
import {
  formatDate,
  formatMoney,
  makeModuleData,
  rowsFrom,
  statusText,
  sumBy,
  uniqueBy,
} from "@/lib/backend-module-adaptor";
import type { PaginatedResponse } from "@/types/backend";
import type { FinanceModuleKey } from "./types";
import type { ModuleData, ModuleRow } from "@/types/modules";
import { financeDummyData } from "./dummy";

const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY_API === "true";

type FinanceTransaction = {
  id: string;
  transaction_no: string;
  transaction_date: string;
  transaction_type?: string;
  cashflow_activity?: string;
  status?: string;
  counterparty_name?: string | null;
  reference_no?: string | null;
  source_module?: string | null;
  subtotal_amount?: number | string;
  tax_amount?: number | string;
  total_amount?: number | string;
  description?: string | null;
  proof_url?: string | null;
  attachment_url?: string | null;
};

type FinanceTaxRecord = {
  id: string;
  tax_type: string;
  tax_period: string;
  taxable_amount?: number | string;
  tax_amount?: number | string;
  paid_amount?: number | string;
  status?: string;
  due_date?: string | null;
  reference_no?: string | null;
};

type FinanceJournalEntry = {
  id: string;
  journal_no: string;
  journal_date: string;
  status?: string;
  memo?: string | null;
  total_debit?: number | string;
  total_credit?: number | string;
  is_balanced?: boolean;
};

type FinanceCashflowSnapshot = {
  id: string;
  report_date: string;
  operating_cash_in?: number | string;
  operating_cash_out?: number | string;
  investing_cash_in?: number | string;
  investing_cash_out?: number | string;
  financing_cash_in?: number | string;
  financing_cash_out?: number | string;
  net_cashflow?: number | string;
  ending_cash_balance?: number | string;
};

type FinanceBundle = {
  transactions: FinanceTransaction[];
  taxRecords: FinanceTaxRecord[];
  journalEntries: FinanceJournalEntry[];
  cashflowSnapshots: FinanceCashflowSnapshot[];
};

async function getList<T>(url: string, sortBy = "created_at") {
  const response = await api.get<PaginatedResponse<T>>(url, {
    params: { limit: 100, sort_by: sortBy, sort_order: "desc" },
  });

  return rowsFrom(response.data);
}

async function fetchFinanceBundle(): Promise<FinanceBundle> {
  const [transactions, taxRecords, journalEntries, cashflowSnapshots] =
    await Promise.all([
      getList<FinanceTransaction>("/api/v1/finance/transactions", "transaction_date"),
      getList<FinanceTaxRecord>("/api/v1/finance/tax-records", "created_at"),
      getList<FinanceJournalEntry>("/api/v1/finance/journal-entries", "journal_date"),
      getList<FinanceCashflowSnapshot>("/api/v1/finance/cashflow-snapshots", "report_date"),
    ]);

  return {
    transactions: uniqueBy(transactions, (row) => row.id || row.transaction_no),
    taxRecords: uniqueBy(taxRecords, (row) => row.id),
    journalEntries: uniqueBy(journalEntries, (row) => row.id || row.journal_no),
    cashflowSnapshots: uniqueBy(cashflowSnapshots, (row) => row.id),
  };
}

function makeOverviewRows(bundle: FinanceBundle): ModuleRow[] {
  return bundle.transactions.map((transaction) => ({
    id: transaction.id,
    transaction: transaction.transaction_no,
    type: statusText(transaction.transaction_type),
    amount: formatMoney(transaction.total_amount),
    date: formatDate(transaction.transaction_date),
    status: statusText(transaction.status),
  }));
}

function makeTransactionRows(bundle: FinanceBundle): ModuleRow[] {
  return bundle.transactions.map((transaction) => ({
    id: transaction.id,
    code: transaction.transaction_no,
    description: transaction.description || transaction.counterparty_name || "-",
    amount: formatMoney(transaction.total_amount),
    category: statusText(transaction.transaction_type),
    proof: transaction.proof_url || transaction.attachment_url || "-",
    status: statusText(transaction.status),
  }));
}

function makeInvoiceRows(bundle: FinanceBundle): ModuleRow[] {
  const invoices = bundle.transactions.filter((transaction) => {
    const source = `${transaction.source_module ?? ""} ${transaction.reference_no ?? ""} ${transaction.transaction_no}`.toLowerCase();
    return source.includes("invoice") || source.includes("inv");
  });

  const sourceRows = invoices.length ? invoices : bundle.transactions;

  return sourceRows.map((transaction) => ({
    id: transaction.id,
    invoice: transaction.reference_no || transaction.transaction_no,
    client: transaction.counterparty_name || "-",
    amount: formatMoney(transaction.total_amount),
    due: formatDate(transaction.transaction_date),
    status: statusText(transaction.status),
  }));
}

function makeCashflowRows(bundle: FinanceBundle): ModuleRow[] {
  if (bundle.cashflowSnapshots.length) {
    return bundle.cashflowSnapshots.map((snapshot) => ({
      id: snapshot.id,
      period: formatDate(snapshot.report_date),
      cashIn: formatMoney(
        Number(snapshot.operating_cash_in ?? 0) +
          Number(snapshot.investing_cash_in ?? 0) +
          Number(snapshot.financing_cash_in ?? 0)
      ),
      cashOut: formatMoney(
        Number(snapshot.operating_cash_out ?? 0) +
          Number(snapshot.investing_cash_out ?? 0) +
          Number(snapshot.financing_cash_out ?? 0)
      ),
      net: formatMoney(snapshot.net_cashflow),
      status: Number(snapshot.net_cashflow ?? 0) < 0 ? "Risk" : "Positive",
    }));
  }

  return bundle.transactions.map((transaction) => ({
    id: transaction.id,
    period: formatDate(transaction.transaction_date),
    cashIn: transaction.transaction_type === "income" ? formatMoney(transaction.total_amount) : formatMoney(0),
    cashOut: transaction.transaction_type === "expense" ? formatMoney(transaction.total_amount) : formatMoney(0),
    net: formatMoney(
      transaction.transaction_type === "expense"
        ? -Number(transaction.total_amount ?? 0)
        : transaction.total_amount
    ),
    status: transaction.transaction_type === "expense" ? "Out" : "In",
  }));
}

function makeTaxRows(bundle: FinanceBundle): ModuleRow[] {
  return bundle.taxRecords.map((tax) => ({
    id: tax.id,
    type: statusText(tax.tax_type),
    period: tax.tax_period,
    amount: formatMoney(tax.tax_amount),
    paid: formatMoney(tax.paid_amount),
    due: formatDate(tax.due_date),
    status: statusText(tax.status),
  }));
}

function makeLedgerRows(bundle: FinanceBundle): ModuleRow[] {
  return bundle.journalEntries.map((journal) => ({
    id: journal.id,
    account: journal.journal_no,
    debit: formatMoney(journal.total_debit),
    credit: formatMoney(journal.total_credit),
    period: formatDate(journal.journal_date),
    status: journal.is_balanced ? statusText(journal.status) : "Unbalanced",
  }));
}

function makeFinanceMetrics(bundle: FinanceBundle) {
  const income = sumBy(
    bundle.transactions.filter((transaction) => transaction.transaction_type === "income"),
    (transaction) => transaction.total_amount
  );

  const expense = sumBy(
    bundle.transactions.filter((transaction) => transaction.transaction_type === "expense"),
    (transaction) => transaction.total_amount
  );

  const pending = bundle.transactions.filter((transaction) =>
    ["draft", "pending"].includes(String(transaction.status))
  ).length;

  return [
    {
      label: "Income",
      value: formatMoney(income),
      helper: "Total income dari /finance/transactions",
    },
    {
      label: "Expense",
      value: formatMoney(expense),
      helper: "Total expense dari /finance/transactions",
    },
    {
      label: "Pending",
      value: String(pending),
      helper: "Draft/pending transaction",
    },
  ];
}

export async function getFinanceModuleData(
  moduleKey: FinanceModuleKey
): Promise<ModuleData> {
  if (USE_DUMMY) return financeDummyData[moduleKey];

  const bundle = await fetchFinanceBundle();

  const mapper: Record<FinanceModuleKey, () => ModuleRow[]> = {
    overview: () => makeOverviewRows(bundle),
    transactions: () => makeTransactionRows(bundle),
    invoices: () => makeInvoiceRows(bundle),
    cashflow: () => makeCashflowRows(bundle),
    taxes: () => makeTaxRows(bundle),
    ledger: () => makeLedgerRows(bundle),
  };

  return makeModuleData({
    rows: mapper[moduleKey](),
    metrics: makeFinanceMetrics(bundle),
    aiNotes: [
      "Finance sekarang fetch dari endpoint backend asli.",
      "Halaman invoices sementara mengambil transaction yang source/reference mengandung invoice karena backend belum punya model invoice khusus.",
      "Bukti transaksi siap dibaca dari proof_url/attachment_url setelah field dan upload endpoint ditambahkan di backend.",
    ],
  });
}