import { api } from "@/lib/api";
import { getScopedQueryParams } from "@/lib/module-crud";
import type { ModuleData, ModuleMetric, ModuleRow } from "@/types/modules";
import type { FinanceModuleKey } from "./types";

type RawRecord = Record<string, unknown>;

type FinanceDataKind =
  | "transactions"
  | "invoices"
  | "cashflow"
  | "taxes"
  | "ledger"
  | "cashAccounts";

type FinanceBundle = {
  transactions: ModuleRow[];
  invoices: ModuleRow[];
  cashflows: ModuleRow[];
  taxes: ModuleRow[];
  ledger: ModuleRow[];
  cashAccounts: ModuleRow[];
};

const moduleSortBy: Record<FinanceModuleKey, string> = {
  overview: "updated_at",
  transactions: "updated_at",
  invoices: "updated_at",
  cashflow: "updated_at",
  taxes: "updated_at",
  ledger: "updated_at",
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getApiBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (fromEnv) return fromEnv.replace(/\/$/, "");

  return "http://localhost:8000";
}

function normalizeFileUrl(value: unknown) {
  if (!hasValue(value)) return "";

  const url = String(value).trim();

  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  if (url.startsWith("/uploads")) {
    return `${getApiBaseUrl()}${url}`;
  }

  if (url.startsWith("uploads/")) {
    return `${getApiBaseUrl()}/${url}`;
  }

  return url;
}

function normalizeNestedObject(value: RawRecord) {
  const readable =
    value.name ??
    value.full_name ??
    value.company_name ??
    value.branch_name ??
    value.cash_account_name ??
    value.account_name ??
    value.bank_name ??
    value.transaction_no ??
    value.invoice_no ??
    value.journal_no ??
    value.reference_no ??
    value.title ??
    value.code ??
    value.email ??
    value.phone;

  if (hasValue(readable)) return String(readable);

  return JSON.stringify(value);
}

function normalizeRow(row: unknown): ModuleRow {
  if (!row || typeof row !== "object") return {};

  const source = row as RawRecord;
  const result: ModuleRow = {};

  Object.entries(source).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      result[key] = "";
      return;
    }

    if (value instanceof Date) {
      result[key] = value.toISOString();
      return;
    }

    if (typeof value === "object") {
      result[key] = normalizeNestedObject(value as RawRecord);
      return;
    }

    result[key] = String(value);
  });

  return result;
}

function getArrayByKeys(
  record: RawRecord,
  keys: string[]
): unknown[] {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === "object") {
      const nested: unknown[] = getArrayByKeys(
        value as RawRecord,
        keys
      );

      if (nested.length > 0) return nested;
    }
  }

  return [];
}

function normalizeRowsByKind(kind: FinanceDataKind, data: unknown): ModuleRow[] {
  if (Array.isArray(data)) return data.map(normalizeRow);

  if (!data || typeof data !== "object") return [];

  const record = data as RawRecord;

  const commonKeys = ["items", "data", "results", "rows", "records"];

  const keysByKind: Record<FinanceDataKind, string[]> = {
    transactions: [
      "transactions",
      "finance_transactions",
      "transaction_records",
      ...commonKeys,
    ],

    invoices: [
      "invoices",
      "finance_invoices",
      "invoice_records",
      ...commonKeys,
    ],

    cashflow: [
      "cashflow_snapshots",
      "cashflowSnapshots",
      "cashflow_records",
      "cashflowRecords",
      "cashflows",
      "cashflow",
      "snapshots",
      ...commonKeys,
    ],

    taxes: [
      "tax_records",
      "taxRecords",
      "taxes",
      "tax",
      ...commonKeys,
    ],

    ledger: [
      "journal_entries",
      "journalEntries",
      "ledger_entries",
      "ledgerEntries",
      "general_ledger",
      "generalLedger",
      "ledger",
      "ledgers",
      "entries",
      ...commonKeys,
    ],

    cashAccounts: [
      "cash_accounts",
      "cashAccounts",
      "accounts",
      "bank_accounts",
      ...commonKeys,
    ],
  };

  const rows = getArrayByKeys(record, keysByKind[kind]);

  return rows.map(normalizeRow);
}

function uniqueRows(rows: ModuleRow[]) {
  const seen = new Set<string>();

  return rows.filter((row, index) => {
    const key =
      row.id ||
      row.transaction_no ||
      row.invoice_no ||
      row.journal_no ||
      row.reference_no ||
      row.code ||
      row.name ||
      String(index);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function cleanParams(params: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (!hasValue(value)) return;
    result[key] = value;
  });

  return result;
}

function withoutSortParams(params: Record<string, unknown>) {
  const clone = { ...params };

  delete clone.sort_by;
  delete clone.sort_order;

  return clone;
}

async function safeGet(
  kind: FinanceDataKind,
  endpoint: string,
  params: Record<string, unknown> = {}
) {
  const baseParams = cleanParams({
    limit: 100,
    sort_order: "desc",
    ...params,
  });

  const fallbackParams = cleanParams(withoutSortParams(baseParams));
  const paramCandidates = [baseParams, fallbackParams];

  for (const candidateParams of paramCandidates) {
    try {
      const response = await api.get(endpoint, {
        params: candidateParams,
      });

      const rows = uniqueRows(normalizeRowsByKind(kind, response.data));

      if (process.env.NODE_ENV === "development") {
        console.log("[finance safeGet]", {
          kind,
          endpoint,
          params: candidateParams,
          response: response.data,
          rows,
        });
      }

      return rows;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[finance safeGet failed]", {
          kind,
          endpoint,
          params: candidateParams,
          error,
        });
      }
    }
  }

  return [];
}

async function safeGetFromCandidates(
  kind: FinanceDataKind,
  endpoints: string[],
  params: Record<string, unknown> = {}
) {
  for (const endpoint of endpoints) {
    const rows = await safeGet(kind, endpoint, params);

    if (rows.length > 0) return rows;
  }

  return [];
}

function toNumber(value: unknown) {
  if (!hasValue(value)) return 0;

  const cleaned = String(value)
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "")
    .replace(/[^\d.,-]/g, "");

  if (!cleaned) return 0;

  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replaceAll(".", "").replace(",", ".")
      : cleaned.replace(",", ".");

  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  if (!hasValue(value)) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusText(value: unknown) {
  if (!hasValue(value)) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBoolean(value: unknown) {
  if (!hasValue(value)) return "-";

  const normalized = String(value).toLowerCase();

  if (["true", "1", "yes", "balanced"].includes(normalized)) return "Yes";
  if (["false", "0", "no", "unbalanced"].includes(normalized)) return "No";

  return statusText(value);
}

function pick(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) return String(value);
  }

  return "";
}

function pickNumber(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) return toNumber(value);
  }

  return 0;
}

function buildIndex(rows: ModuleRow[]) {
  const index: Record<string, ModuleRow> = {};

  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key !== "id" && !key.endsWith("_id")) return;
      if (!hasValue(value)) return;

      index[String(value)] = row;
    });
  });

  return index;
}

function getCashAccountName(
  row: ModuleRow,
  cashAccountIndex: Record<string, ModuleRow>
) {
  const directName = pick(row, [
    "cash_account_name",
    "account_name",
    "bank_name",
  ]);

  if (directName) return directName;

  const cashAccountId = pick(row, ["cash_account_id", "account_id"]);
  const account = cashAccountIndex[cashAccountId];

  if (!account) return "-";

  const name = pick(account, [
    "name",
    "cash_account_name",
    "account_name",
    "bank_name",
    "account_holder_name",
  ]);

  const bank = pick(account, ["bank_name", "bank"]);
  const number = pick(account, ["account_number", "number", "code"]);

  if (name && bank && number && name !== bank) return `${name} - ${bank} ${number}`;
  if (name && number) return `${name} - ${number}`;
  if (name) return name;

  return "-";
}

function buildTransactionRows(rows: ModuleRow[], cashAccounts: ModuleRow[]) {
  const cashAccountIndex = buildIndex(cashAccounts);

  return rows.map((row) => {
    const rawType = pick(row, [
      "transaction_type",
      "type",
      "transactionType",
    ]);

    const typeLabel = statusText(rawType);

    const rawActivity = pick(row, [
      "cashflow_activity",
      "activity",
      "cashflowActivity",
    ]);

    const activityLabel = statusText(rawActivity);

    const attachment = normalizeFileUrl(
      pick(row, [
        "attachment_url",
        "proof_url",
        "receipt_url",
        "document_url",
        "file_url",
        "attachment",
        "proof",
      ])
    );

    const amount = pick(row, [
      "total_amount",
      "subtotal_amount",
      "tax_amount",
      "amount",
    ]);

    const counterparty = pick(row, [
      "counterparty_name",
      "counterparty",
      "client_name",
      "customer_name",
      "vendor_name",
      "supplier_name",
    ]);

    return {
      ...row,

      date: formatDate(row.transaction_date ?? row.created_at),
      transaction_date_display: formatDate(row.transaction_date),

      account_name: getCashAccountName(row, cashAccountIndex),
      cash_account: getCashAccountName(row, cashAccountIndex),

      type: typeLabel,
      type_label: typeLabel,
      transaction_type: row.transaction_type ?? rawType,
      transaction_type_label: typeLabel,

      activity: activityLabel,
      activity_label: activityLabel,
      cashflow_activity: row.cashflow_activity ?? rawActivity,
      cashflow_activity_label: activityLabel,

      counterparty: counterparty || "-",
      counterparty_name: row.counterparty_name ?? counterparty,

      amount: formatMoney(amount),
      total: formatMoney(row.total_amount),
      total_amount_display: formatMoney(row.total_amount),

      subtotal: formatMoney(row.subtotal_amount),
      subtotal_amount_display: formatMoney(row.subtotal_amount),

      tax_amount_display: formatMoney(row.tax_amount),
      discount_amount_display: formatMoney(row.discount_amount),

      reference: row.reference_no ?? row.transaction_no ?? "-",

      attachment,
      attachment_url: row.attachment_url ?? attachment,
      proof: attachment,
      proof_url: row.proof_url ?? attachment,

      status: statusText(row.status),
      status_label: statusText(row.status),
    };
  });
}

function buildInvoiceRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const total = toNumber(row.total_amount);
    const paid = toNumber(row.paid_amount);
    const outstanding = Math.max(total - paid, 0);

    const client = pick(row, [
      "client_name",
      "customer_name",
      "customer",
      "counterparty_name",
    ]);

    return {
      ...row,

      customer: client || "-",
      client: client || "-",
      client_name: row.client_name ?? client,

      issue_date: formatDate(row.invoice_date),
      invoice_date_display: formatDate(row.invoice_date),
      due_date: formatDate(row.due_date),
      due_date_display: formatDate(row.due_date),

      total: formatMoney(row.total_amount),
      total_amount_display: formatMoney(row.total_amount),

      paid: formatMoney(row.paid_amount),
      paid_amount_display: formatMoney(row.paid_amount),

      outstanding: formatMoney(outstanding),
      outstanding_amount: String(outstanding),
      outstanding_amount_display: formatMoney(outstanding),

      tax_amount_display: formatMoney(row.tax_amount),
      subtotal_amount_display: formatMoney(row.subtotal_amount),

      status: statusText(row.status),
      status_label: statusText(row.status),
    };
  });
}

function buildCashflowRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const beginningCash = pickNumber(row, [
      "beginning_cash_balance",
      "opening_balance",
      "opening",
      "beginning",
      "starting_balance",
    ]);

    const operatingIn = pickNumber(row, [
      "operating_cash_in",
      "cash_in",
      "inflow",
      "operating_in",
    ]);

    const operatingOut = pickNumber(row, [
      "operating_cash_out",
      "cash_out",
      "outflow",
      "operating_out",
    ]);

    const investingIn = pickNumber(row, [
      "investing_cash_in",
      "investing_in",
    ]);

    const investingOut = pickNumber(row, [
      "investing_cash_out",
      "investing_out",
    ]);

    const financingIn = pickNumber(row, [
      "financing_cash_in",
      "financing_in",
    ]);

    const financingOut = pickNumber(row, [
      "financing_cash_out",
      "financing_out",
    ]);

    const totalCashIn = operatingIn + investingIn + financingIn;
    const totalCashOut = operatingOut + investingOut + financingOut;

    const netCashflow = hasValue(row.net_cashflow)
      ? toNumber(row.net_cashflow)
      : hasValue(row.net)
        ? toNumber(row.net)
        : totalCashIn - totalCashOut;

    const endingCash = pickNumber(row, [
      "ending_cash_balance",
      "closing_balance",
      "closing",
      "ending",
    ]);

    const finalEndingCash =
      endingCash || beginningCash + netCashflow;

    const reportDate = pick(row, [
      "report_date",
      "snapshot_date",
      "date",
      "created_at",
    ]);

    return {
      ...row,

      date: formatDate(reportDate),
      snapshot_date: formatDate(reportDate),
      report_date_display: formatDate(reportDate),

      opening: formatMoney(beginningCash),
      opening_balance: formatMoney(beginningCash),
      beginning_cash_balance: String(beginningCash),
      beginning_cash_balance_display: formatMoney(beginningCash),

      cash_in: formatMoney(totalCashIn),
      cash_in_display: formatMoney(totalCashIn),
      total_cash_in: String(totalCashIn),
      total_cash_in_display: formatMoney(totalCashIn),

      cash_out: formatMoney(totalCashOut),
      cash_out_display: formatMoney(totalCashOut),
      total_cash_out: String(totalCashOut),
      total_cash_out_display: formatMoney(totalCashOut),

      operating_cash_in: String(operatingIn),
      operating_cash_in_display: formatMoney(operatingIn),

      operating_cash_out: String(operatingOut),
      operating_cash_out_display: formatMoney(operatingOut),

      investing_cash_in: String(investingIn),
      investing_cash_in_display: formatMoney(investingIn),

      investing_cash_out: String(investingOut),
      investing_cash_out_display: formatMoney(investingOut),

      financing_cash_in: String(financingIn),
      financing_cash_in_display: formatMoney(financingIn),

      financing_cash_out: String(financingOut),
      financing_cash_out_display: formatMoney(financingOut),

      net: formatMoney(netCashflow),
      net_cashflow: String(netCashflow),
      net_cashflow_display: formatMoney(netCashflow),

      closing: formatMoney(finalEndingCash),
      closing_balance: formatMoney(finalEndingCash),
      ending_cash_balance: String(finalEndingCash),
      ending_cash_balance_display: formatMoney(finalEndingCash),

      status: statusText(row.status),
      status_label: statusText(row.status),
    };
  });
}

function buildTaxRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const proof = normalizeFileUrl(
      pick(row, ["proof_url", "attachment_url", "proof", "attachment"])
    );

    return {
      ...row,

      period: row.tax_period ?? row.period ?? "-",
      tax_period_display: row.tax_period ?? row.period ?? "-",

      tax_type: statusText(row.tax_type),
      tax_type_label: statusText(row.tax_type),

      taxable: formatMoney(row.taxable_amount),
      taxable_amount_display: formatMoney(row.taxable_amount),

      tax_amount: formatMoney(row.tax_amount),
      tax_amount_display: formatMoney(row.tax_amount),

      paid: formatMoney(row.paid_amount),
      paid_amount_display: formatMoney(row.paid_amount),

      due_date: formatDate(row.due_date),
      due_date_display: formatDate(row.due_date),

      paid_date_display: formatDate(row.paid_date),
      reported_date_display: formatDate(row.reported_date),

      proof,
      proof_url: row.proof_url ?? proof,

      status: statusText(row.status),
      status_label: statusText(row.status),
    };
  });
}

function buildLedgerRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const debit = pickNumber(row, [
      "total_debit",
      "debit",
      "debit_amount",
    ]);

    const credit = pickNumber(row, [
      "total_credit",
      "credit",
      "credit_amount",
    ]);

    const balance = debit - credit;

    const attachment = normalizeFileUrl(
      pick(row, ["attachment_url", "proof_url", "attachment", "proof"])
    );

    const account =
      pick(row, [
        "account_name",
        "cash_account_name",
        "transaction_no_display",
        "transaction_no",
        "reference_no",
        "journal_no",
      ]) || "Journal Entry";

    const journalDate = pick(row, [
      "journal_date",
      "entry_date",
      "date",
      "created_at",
    ]);

    return {
      ...row,

      date: formatDate(journalDate),
      entry_date: formatDate(journalDate),
      journal_date_display: formatDate(journalDate),

      account,
      account_name: row.account_name ?? account,

      debit: formatMoney(debit),
      total_debit: String(debit),
      total_debit_display: formatMoney(debit),

      credit: formatMoney(credit),
      total_credit: String(credit),
      total_credit_display: formatMoney(credit),

      balance: formatMoney(balance),
      balance_display: formatMoney(balance),

      is_balanced_display: formatBoolean(row.is_balanced),
      is_balanced_label: formatBoolean(row.is_balanced),

      memo: row.memo ?? row.description ?? "-",

      attachment,
      attachment_url: row.attachment_url ?? attachment,

      status: statusText(row.status),
      status_label: statusText(row.status),
    };
  });
}

function buildFinanceMetrics(bundle: FinanceBundle): ModuleMetric[] {
  const income = bundle.transactions
    .filter((row) => String(row.transaction_type).toLowerCase() === "income")
    .reduce((total, row) => total + toNumber(row.total_amount), 0);

  const expense = bundle.transactions
    .filter((row) => String(row.transaction_type).toLowerCase() === "expense")
    .reduce((total, row) => total + toNumber(row.total_amount), 0);

  const invoiceOutstanding = bundle.invoices.reduce((total, row) => {
    return total + Math.max(toNumber(row.total_amount) - toNumber(row.paid_amount), 0);
  }, 0);

  return [
    {
      label: "Income",
      value: formatMoney(income),
      helper: "Total transaksi income.",
      trend: income > 0 ? "Tracked" : "Empty",
    },
    {
      label: "Expense",
      value: formatMoney(expense),
      helper: "Total transaksi expense.",
      trend: expense > 0 ? "Tracked" : "Empty",
    },
    {
      label: "Outstanding",
      value: formatMoney(invoiceOutstanding),
      helper: "Total invoice outstanding.",
      trend: invoiceOutstanding > 0 ? "Need follow-up" : "Clear",
    },
  ];
}

function getFinanceRows(moduleKey: FinanceModuleKey, bundle: FinanceBundle) {
  if (moduleKey === "overview" || moduleKey === "transactions") {
    return buildTransactionRows(bundle.transactions, bundle.cashAccounts);
  }

  if (moduleKey === "invoices") {
    return buildInvoiceRows(bundle.invoices);
  }

  if (moduleKey === "cashflow") {
    return buildCashflowRows(bundle.cashflows);
  }

  if (moduleKey === "taxes") {
    return buildTaxRows(bundle.taxes);
  }

  if (moduleKey === "ledger") {
    return buildLedgerRows(bundle.ledger);
  }

  return [];
}

async function getCurrentRows(moduleKey: FinanceModuleKey, params: Record<string, unknown>) {
  const sortBy = moduleSortBy[moduleKey];

  if (moduleKey === "overview" || moduleKey === "transactions") {
    return safeGetFromCandidates("transactions", ["/api/v1/finance/transactions"], {
      ...params,
      sort_by: sortBy,
    });
  }

  if (moduleKey === "invoices") {
    return safeGetFromCandidates("invoices", ["/api/v1/finance/invoices"], {
      ...params,
      sort_by: sortBy,
    });
  }

  if (moduleKey === "cashflow") {
    return safeGetFromCandidates(
      "cashflow",
      [
        "/api/v1/finance/cashflow-snapshots",
        "/api/v1/finance/cashflow",
        "/api/v1/finance/cashflows",
      ],
      {
        ...params,
        sort_by: sortBy,
      }
    );
  }

  if (moduleKey === "taxes") {
    return safeGetFromCandidates(
      "taxes",
      [
        "/api/v1/finance/tax-records",
        "/api/v1/finance/taxes",
      ],
      {
        ...params,
        sort_by: sortBy,
      }
    );
  }

  if (moduleKey === "ledger") {
    return safeGetFromCandidates(
      "ledger",
      [
        "/api/v1/finance/journal-entries",
        "/api/v1/finance/general-ledger",
      ],
      {
        ...params,
        sort_by: sortBy,
      }
    );
  }

  return [];
}

export async function getFinanceModuleData(
  moduleKey: FinanceModuleKey
): Promise<ModuleData> {
  const params = getScopedQueryParams("finance");

  const [
    currentRows,
    transactions,
    invoices,
    cashflows,
    taxes,
    ledger,
    cashAccounts,
  ] = await Promise.all([
    getCurrentRows(moduleKey, params),

    safeGetFromCandidates("transactions", ["/api/v1/finance/transactions"], {
      ...params,
      sort_by: "transaction_date",
    }),

    safeGetFromCandidates("invoices", ["/api/v1/finance/invoices"], {
      ...params,
      sort_by: "invoice_date",
    }),

    safeGetFromCandidates(
      "cashflow",
      [
        "/api/v1/finance/cashflow-snapshots",
        "/api/v1/finance/cashflow",
        "/api/v1/finance/cashflows",
      ],
      {
        ...params,
        sort_by: "report_date",
      }
    ),

    safeGetFromCandidates(
      "taxes",
      [
        "/api/v1/finance/tax-records",
        "/api/v1/finance/taxes",
      ],
      {
        ...params,
        sort_by: "created_at",
      }
    ),

    safeGetFromCandidates(
      "ledger",
      [
        "/api/v1/finance/journal-entries",
        "/api/v1/finance/general-ledger",
      ],
      {
        ...params,
        sort_by: "journal_date",
      }
    ),

    safeGetFromCandidates("cashAccounts", ["/api/v1/finance/cash-accounts"], {
      ...params,
      sort_by: "created_at",
      sort_order: "asc",
    }),
  ]);

  const bundle: FinanceBundle = {
    transactions:
      moduleKey === "overview" || moduleKey === "transactions"
        ? currentRows
        : transactions,

    invoices: moduleKey === "invoices" ? currentRows : invoices,

    cashflows: moduleKey === "cashflow" ? currentRows : cashflows,

    taxes: moduleKey === "taxes" ? currentRows : taxes,

    ledger: moduleKey === "ledger" ? currentRows : ledger,

    cashAccounts,
  };

  const rows = getFinanceRows(moduleKey, bundle);

  if (process.env.NODE_ENV === "development") {
    console.log("[getFinanceModuleData]", {
      moduleKey,
      params,
      currentRows,
      bundle,
      rows,
    });
  }

  return {
    metrics: buildFinanceMetrics(bundle),
    rows,
    aiNotes: [
      `Finance/${moduleKey} dibaca langsung dari finance service.`,
      "Ledger sudah dibuat strict agar tidak mengambil data cashflow.",
      "Cashflow sudah membaca opening, cash in, cash out, net, dan closing dari beberapa kemungkinan nama field.",
      "Transaction type tersedia sebagai type, type_label, transaction_type, dan transaction_type_label.",
    ],
  };
}