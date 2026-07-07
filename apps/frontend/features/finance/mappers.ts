import type { ModuleMetric, ModuleRow } from "@/types/modules";

export type FinanceBundle = {
  transactions: ModuleRow[];
  invoices: ModuleRow[];
  cashflows: ModuleRow[];
  taxes: ModuleRow[];
  ledger: ModuleRow[];
  cashAccounts: ModuleRow[];
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function pick(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) {
      return String(value);
    }
  }

  return "";
}

function hasAny(row: ModuleRow, keys: string[]) {
  return keys.some((key) => hasValue(row[key]));
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

  return Number.isFinite(parsed) ? parsed : 0;
}

function pickNumber(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) {
      return toNumber(value);
    }
  }

  return 0;
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

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

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

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "balanced"].includes(normalized)) {
    return "Yes";
  }

  if (["false", "0", "no", "unbalanced"].includes(normalized)) {
    return "No";
  }

  return statusText(value);
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
  const number = pick(account, [
    "account_number",
    "account_no",
    "number",
    "code",
  ]);

  if (name && bank && number && name !== bank) {
    return `${name} - ${bank} ${number}`;
  }

  if (name && number) return `${name} - ${number}`;
  if (name) return name;

  return "-";
}

function isCashflowLikeRow(row: ModuleRow) {
  return hasAny(row, [
    "beginning_cash_balance",
    "opening_balance",
    "operating_cash_in",
    "operating_cash_out",
    "investing_cash_in",
    "investing_cash_out",
    "financing_cash_in",
    "financing_cash_out",
    "net_cashflow",
    "ending_cash_balance",
    "closing_balance",
  ]);
}

function isLedgerLikeRow(row: ModuleRow) {
  return hasAny(row, [
    "journal_no",
    "journal_date",
    "entry_date",
    "total_debit",
    "total_credit",
    "debit",
    "credit",
    "debit_amount",
    "credit_amount",
    "memo",
    "is_balanced",
  ]);
}

export function buildTransactionRows(
  rows: ModuleRow[],
  cashAccounts: ModuleRow[] = []
) {
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

      category: activityLabel,

      amount: formatMoney(amount),
      total: formatMoney(row.total_amount),
      total_amount_display: formatMoney(row.total_amount),

      subtotal: formatMoney(row.subtotal_amount),
      subtotal_amount_display: formatMoney(row.subtotal_amount),

      tax_amount_display: formatMoney(row.tax_amount),
      discount_amount_display: formatMoney(row.discount_amount),

      reference: row.reference_no ?? row.transaction_no ?? "-",
      payment_method:
        row.payment_method ??
        row.cash_account_name ??
        row.account_name ??
        getCashAccountName(row, cashAccountIndex),

      attachment,
      attachment_url: row.attachment_url ?? attachment,
      proof: attachment,
      proof_url: row.proof_url ?? attachment,

      status: statusText(row.status),
      status_label: statusText(row.status),
    };
  });
}

export function buildInvoiceRows(rows: ModuleRow[]) {
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

export function buildCashflowRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const beginningCash = pickNumber(row, [
      "beginning_cash_balance",
      "opening_balance",
      "opening",
      "beginning",
      "starting_balance",
    ]);

    const operatingCashIn = pickNumber(row, [
      "operating_cash_in",
      "cash_in",
      "inflow",
      "operating_in",
    ]);

    const operatingCashOut = pickNumber(row, [
      "operating_cash_out",
      "cash_out",
      "outflow",
      "operating_out",
    ]);

    const investingCashIn = pickNumber(row, [
      "investing_cash_in",
      "investing_in",
    ]);

    const investingCashOut = pickNumber(row, [
      "investing_cash_out",
      "investing_out",
    ]);

    const financingCashIn = pickNumber(row, [
      "financing_cash_in",
      "financing_in",
    ]);

    const financingCashOut = pickNumber(row, [
      "financing_cash_out",
      "financing_out",
    ]);

    const totalCashIn =
      operatingCashIn + investingCashIn + financingCashIn;

    const totalCashOut =
      operatingCashOut + investingCashOut + financingCashOut;

    const netCashflow = hasValue(row.net_cashflow)
      ? toNumber(row.net_cashflow)
      : totalCashIn - totalCashOut;

    const endingCashFromBackend = pickNumber(row, [
      "ending_cash_balance",
      "closing_balance",
      "closing",
      "ending",
    ]);

    const endingCash =
      endingCashFromBackend || beginningCash + netCashflow;

    const reportDate = pick(row, [
      "report_date",
      "snapshot_date",
      "date",
      "created_at",
    ]);

    return {
      ...row,

      /**
       * Raw field tetap disimpan supaya edit/detail tetap aman.
       */
      report_date: row.report_date ?? reportDate,

      beginning_cash_balance: String(beginningCash),
      operating_cash_in: String(operatingCashIn),
      operating_cash_out: String(operatingCashOut),
      investing_cash_in: String(investingCashIn),
      investing_cash_out: String(investingCashOut),
      financing_cash_in: String(financingCashIn),
      financing_cash_out: String(financingCashOut),
      net_cashflow: String(netCashflow),
      ending_cash_balance: String(endingCash),

      /**
       * Field display untuk table.
       */
      report_date_display: formatDate(reportDate),

      beginning_cash_balance_display: formatMoney(beginningCash),
      operating_cash_in_display: formatMoney(operatingCashIn),
      operating_cash_out_display: formatMoney(operatingCashOut),
      investing_cash_in_display: formatMoney(investingCashIn),
      investing_cash_out_display: formatMoney(investingCashOut),
      financing_cash_in_display: formatMoney(financingCashIn),
      financing_cash_out_display: formatMoney(financingCashOut),
      net_cashflow_display: formatMoney(netCashflow),
      ending_cash_balance_display: formatMoney(endingCash),

      /**
       * Alias tambahan kalau table lama masih baca ini.
       */
      snapshot_date: formatDate(reportDate),
      opening: formatMoney(beginningCash),
      cash_in: formatMoney(totalCashIn),
      cash_out: formatMoney(totalCashOut),
      net: formatMoney(netCashflow),
      closing: formatMoney(endingCash),

      total_cash_in: String(totalCashIn),
      total_cash_in_display: formatMoney(totalCashIn),

      total_cash_out: String(totalCashOut),
      total_cash_out_display: formatMoney(totalCashOut),

      status: statusText(row.status),
      status_label: statusText(row.status),
    };
  });
}

export function buildTaxRows(rows: ModuleRow[]) {
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

export function buildLedgerRows(rows: ModuleRow[]) {
  return rows
    /**
     * Ini penting:
     * Kalau ledger page masih tidak sengaja menerima row cashflow,
     * jangan render sebagai ledger.
     */
    .filter((row) => {
      if (isLedgerLikeRow(row)) return true;
      if (isCashflowLikeRow(row)) return false;

      return false;
    })
    .map((row) => {
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

        /**
         * INI YANG DIBACA COLUMNS LEDGER
         */
        journal_no: row.journal_no ?? row.reference_no ?? "-",
        entry_date: formatDate(journalDate),
        account,
        debit: formatMoney(debit),
        credit: formatMoney(credit),
        status: statusText(row.status),
        attachment,

        /**
         * Alias detail/display
         */
        date: formatDate(journalDate),
        journal_date_display: formatDate(journalDate),

        account_name: row.account_name ?? account,

        total_debit: String(debit),
        total_debit_display: formatMoney(debit),

        total_credit: String(credit),
        total_credit_display: formatMoney(credit),

        balance: formatMoney(balance),
        balance_display: formatMoney(balance),

        is_balanced_display: formatBoolean(row.is_balanced),
        is_balanced_label: formatBoolean(row.is_balanced),

        memo: row.memo ?? row.description ?? "-",

        attachment_url: row.attachment_url ?? attachment,
        proof: attachment,
        proof_url: row.proof_url ?? attachment,

        status_label: statusText(row.status),
      };
    });
}

export function buildFinanceMetrics(bundle: FinanceBundle): ModuleMetric[] {
  const income = bundle.transactions
    .filter((row) => String(row.transaction_type).toLowerCase() === "income")
    .reduce((total, row) => total + toNumber(row.total_amount), 0);

  const expense = bundle.transactions
    .filter((row) => String(row.transaction_type).toLowerCase() === "expense")
    .reduce((total, row) => total + toNumber(row.total_amount), 0);

  const outstanding = bundle.invoices.reduce((total, row) => {
    const invoiceTotal = toNumber(row.total_amount);
    const paid = toNumber(row.paid_amount);

    return total + Math.max(invoiceTotal - paid, 0);
  }, 0);

  const latestCashflow = bundle.cashflows[0];
  const cashPosition = latestCashflow
    ? toNumber(
        latestCashflow.ending_cash_balance ??
          latestCashflow.closing_balance ??
          latestCashflow.net_cashflow
      )
    : income - expense;

  return [
    {
      label: "Income",
      value: formatMoney(income),
      helper: "Total transaksi bertipe income.",
      trend: income > 0 ? "Tracked" : "Empty",
    },
    {
      label: "Expense",
      value: formatMoney(expense),
      helper: "Total transaksi bertipe expense.",
      trend: expense > 0 ? "Tracked" : "Empty",
    },
    {
      label: "Outstanding",
      value: formatMoney(outstanding),
      helper: "Invoice yang belum sepenuhnya dibayar.",
      trend: outstanding > 0 ? "Need follow up" : "Clear",
    },
    {
      label: "Cash Position",
      value: formatMoney(cashPosition),
      helper: "Saldo kas terakhir dari cashflow snapshot.",
      trend: cashPosition >= 0 ? "Positive" : "Negative",
    },
    {
      label: "Journal Entries",
      value: String(bundle.ledger.length),
      helper: "Jumlah journal entry yang terbaca.",
      trend: bundle.ledger.length > 0 ? "Synced" : "Empty",
    },
  ];
}