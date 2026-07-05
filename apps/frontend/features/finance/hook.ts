"use client";

import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";
import { api } from "@/lib/api";
import { getModuleEndpoint, getScopedQueryParams } from "@/lib/module-crud";
import type { ModuleData, ModuleRow } from "@/types/modules";

import type { FinanceModuleKey } from "./types";

function normalizeRow(row: unknown): ModuleRow {
  if (!row || typeof row !== "object") return {};

  const source = row as Record<string, unknown>;
  const result: ModuleRow = {};

  Object.entries(source).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      result[key] = "";
      return;
    }

    if (typeof value === "object") {
      result[key] = JSON.stringify(value);
      return;
    }

    result[key] = String(value);
  });

  return result;
}

function normalizeRows(data: unknown): ModuleRow[] {
  if (Array.isArray(data)) return data.map(normalizeRow);

  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;

  if (Array.isArray(record.items)) return record.items.map(normalizeRow);
  if (Array.isArray(record.data)) return record.data.map(normalizeRow);
  if (Array.isArray(record.results)) return record.results.map(normalizeRow);
  if (Array.isArray(record.rows)) return record.rows.map(normalizeRow);

  return [];
}

async function safeGet(endpoint: string, params?: Record<string, unknown>) {
  try {
    const response = await api.get(endpoint, { params });
    return normalizeRows(response.data);
  } catch (error) {
    console.warn(`Failed to fetch ${endpoint}:`, error);
    return [];
  }
}

async function fetchCashAccounts(params?: Record<string, unknown>) {
  const candidates = [
    "/api/v1/finance/cash-accounts",
    "/api/v1/finance/cash_accounts",
    "/api/v1/finance/accounts",
    "/api/v1/accounts",
  ];

  for (const endpoint of candidates) {
    const rows = await safeGet(endpoint, params);

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function pick(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function toMap(rows: ModuleRow[], key = "id") {
  return rows.reduce<Record<string, ModuleRow>>((acc, row) => {
    const id = row[key];

    if (id) {
      acc[id] = row;
    }

    return acc;
  }, {});
}

function toNumber(value: string | undefined) {
  if (!value) return 0;

  const raw = String(value).trim();

  if (!raw) return 0;

  const withoutCurrency = raw
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "");

  let normalized = withoutCurrency;

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replaceAll(".", "").replaceAll(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replaceAll(",", ".");
  }

  normalized = normalized.replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return 0;

  return parsed;
}

function formatMoney(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : toNumber(value);

  if (Number.isNaN(parsed)) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function formatDate(value: string | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function shortId(value: string | undefined) {
  if (!value) return "-";
  if (value.length <= 12) return value;

  return `${value.slice(0, 8)}...`;
}

function getDate(row: ModuleRow) {
  return pick(row, [
    "transaction_date",
    "date",
    "entry_date",
    "issue_date",
    "snapshot_date",
    "payment_date",
    "created_at",
    "updated_at",
  ]);
}

function getReference(row: ModuleRow) {
  return pick(row, [
    "transaction_no",
    "transaction_number",
    "reference_no",
    "reference_number",
    "reference",
    "ref_no",
    "code",
    "number",
    "invoice_no",
    "journal_no",
    "document_no",
    "payment_reference",
    "external_reference",
  ]);
}

function getType(row: ModuleRow) {
  return pick(row, [
    "transaction_type",
    "type",
    "finance_type",
    "cashflow_type",
    "tax_type",
    "entry_type",
  ]);
}

function getCategory(row: ModuleRow) {
  return pick(row, [
    "category",
    "category_name",
    "transaction_category",
    "expense_category",
    "income_category",
    "cashflow_activity",
    "account_name",
    "account",
    "account_code",
    "description",
    "notes",
  ]);
}

function getAmount(row: ModuleRow) {
  return pick(row, [
    "total_amount",
    "amount",
    "transaction_amount",
    "nominal",
    "value",
    "total",
    "grand_total",
    "paid_amount",
    "tax_amount",
    "subtotal_amount",
    "closing_balance",
    "net_cashflow",
    "debit_amount",
    "credit_amount",
    "debit",
    "credit",
  ]);
}

function getStatus(row: ModuleRow) {
  return (
    pick(row, [
      "status",
      "payment_status",
      "posting_status",
      "approval_status",
      "state",
    ]) || "draft"
  );
}

function getAttachment(row: ModuleRow) {
  return (
    pick(row, [
      "attachment_url",
      "attachment",
      "file_url",
      "file_path",
      "document_url",
      "document_path",
      "proof_url",
      "proof_path",
      "receipt_url",
      "receipt_path",
      "invoice_url",
      "invoice_path",
      "tax_proof_url",
      "payment_proof_url",
      "path",
      "url",
    ]) || "-"
  );
}

function getCustomer(row: ModuleRow) {
  return (
    pick(row, [
      "customer_name",
      "customer",
      "client_name",
      "contact_name",
      "buyer_name",
    ]) || shortId(row.customer_id)
  );
}

function getCashAccountName(
  row: ModuleRow,
  cashAccountMap: Record<string, ModuleRow>
) {
  const directName = pick(row, [
    "account_name",
    "cash_account_name",
    "cash_account",
    "bank_name",
  ]);

  if (directName) return directName;

  const cashAccountId = pick(row, [
    "cash_account_id",
    "account_id",
    "accounts_id",
  ]);

  const cashAccount = cashAccountMap[cashAccountId];

  if (!cashAccount) return shortId(cashAccountId);

  const name = pick(cashAccount, [
    "name",
    "account_name",
    "cash_account_name",
    "bank_name",
  ]);

  const accountNumber = pick(cashAccount, [
    "account_number",
    "number",
    "code",
  ]);

  if (name && accountNumber) return `${name} - ${accountNumber}`;
  if (name) return name;

  return shortId(cashAccountId);
}

function buildFinanceMetrics({
  transactions,
  invoices,
  taxes,
  cashflows,
}: {
  transactions: ModuleRow[];
  invoices: ModuleRow[];
  taxes: ModuleRow[];
  cashflows: ModuleRow[];
}) {
  const income = transactions
    .filter((row) => getType(row).toLowerCase().includes("income"))
    .reduce((total, row) => total + toNumber(getAmount(row)), 0);

  const expense = transactions
    .filter((row) => getType(row).toLowerCase().includes("expense"))
    .reduce((total, row) => total + toNumber(getAmount(row)), 0);

  const outstanding = invoices.reduce((total, row) => {
    const totalAmount = toNumber(
      pick(row, ["total_amount", "grand_total", "total", "amount"])
    );
    const paidAmount = toNumber(pick(row, ["paid_amount", "paid"]));

    return total + Math.max(totalAmount - paidAmount, 0);
  }, 0);

  const taxPayable = taxes
    .filter((row) => !getStatus(row).toLowerCase().includes("paid"))
    .reduce(
      (total, row) =>
        total + toNumber(pick(row, ["tax_amount", "amount", "total_amount"])),
      0
    );

  const latestClosing =
    cashflows.length > 0
      ? toNumber(
          pick(cashflows[0], [
            "closing_balance",
            "ending_balance",
            "balance",
            "net_cashflow",
          ])
        )
      : income - expense;

  return [
    {
      label: "Income",
      value: formatMoney(income),
      helper: "Total pemasukan dari transaksi income.",
      trend: income > 0 ? "Tracked" : undefined,
    },
    {
      label: "Expense",
      value: formatMoney(expense),
      helper: "Total pengeluaran dari transaksi expense.",
      trend: expense > 0 ? "Tracked" : undefined,
    },
    {
      label: "Outstanding",
      value: formatMoney(outstanding),
      helper: "Invoice yang belum sepenuhnya dibayar.",
      trend: outstanding > 0 ? "Need follow up" : "Clear",
    },
    {
      label: "Tax Payable",
      value: formatMoney(taxPayable),
      helper: "Estimasi pajak yang belum paid.",
      trend: taxPayable > 0 ? "Due" : "Clear",
    },
    {
      label: "Cash Position",
      value: formatMoney(latestClosing),
      helper: "Saldo kas terakhir dari cashflow snapshot.",
      trend: latestClosing >= 0 ? "Positive" : "Negative",
    },
  ];
}

function buildTransactionRows(
  rows: ModuleRow[],
  cashAccountMap: Record<string, ModuleRow>
) {
  return rows.map((row) => {
    const reference = getReference(row);
    const amountValue = getAmount(row);
    const totalAmountValue =
      pick(row, ["total_amount", "grand_total", "total"]) || amountValue;

    return {
      ...row,
      date: formatDate(getDate(row)),
      reference: reference || shortId(row.id),
      transaction_no: reference || shortId(row.id),
      account_name: getCashAccountName(row, cashAccountMap),
      type: getType(row) || "-",
      category: getCategory(row) || "-",
      amount: formatMoney(amountValue),
      total_amount: formatMoney(totalAmountValue),
      payment_method:
        pick(row, ["payment_method", "payment_type", "method"]) || "-",
      status: getStatus(row),
      attachment: getAttachment(row),
    };
  });
}

function buildInvoiceRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const totalAmount = toNumber(
      pick(row, ["total_amount", "grand_total", "total", "amount"])
    );
    const paidAmount = toNumber(pick(row, ["paid_amount", "paid"]));
    const outstanding = Math.max(totalAmount - paidAmount, 0);

    return {
      ...row,
      invoice_no: getReference(row) || shortId(row.id),
      customer: getCustomer(row),
      issue_date: formatDate(pick(row, ["issue_date", "date", "created_at"])),
      due_date: formatDate(pick(row, ["due_date", "payment_due_date"])),
      total: formatMoney(totalAmount),
      paid: formatMoney(paidAmount),
      outstanding: formatMoney(outstanding),
      status: getStatus(row),
      attachment: getAttachment(row),
    };
  });
}

function buildCashflowRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const cashIn = toNumber(pick(row, ["cash_in", "inflow", "total_in"]));
    const cashOut = toNumber(pick(row, ["cash_out", "outflow", "total_out"]));

    const pickedNet = toNumber(pick(row, ["net_cashflow", "net", "net_amount"]));
    const net = pickedNet || cashIn - cashOut;

    return {
      ...row,
      snapshot_date: formatDate(
        pick(row, ["snapshot_date", "date", "created_at"])
      ),
      opening: formatMoney(
        pick(row, ["opening_balance", "starting_balance", "beginning_balance"])
      ),
      cash_in: formatMoney(cashIn),
      cash_out: formatMoney(cashOut),
      closing: formatMoney(
        pick(row, ["closing_balance", "ending_balance", "balance"])
      ),
      net: formatMoney(net),
      status: getStatus(row),
    };
  });
}

function buildTaxRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    return {
      ...row,
      period: pick(row, ["period", "tax_period", "month", "year"]) || "-",
      tax_type: getType(row) || "-",
      taxable: formatMoney(
        pick(row, ["taxable_amount", "tax_base", "dpp", "base_amount"])
      ),
      tax_amount: formatMoney(
        pick(row, ["tax_amount", "amount", "total_amount"])
      ),
      due_date: formatDate(pick(row, ["due_date", "payment_due_date"])),
      status: getStatus(row),
      proof: getAttachment(row),
    };
  });
}

function buildLedgerRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    return {
      ...row,
      journal_no: getReference(row) || shortId(row.id),
      entry_date: formatDate(pick(row, ["entry_date", "date", "created_at"])),
      account:
        pick(row, ["account_name", "account", "account_code", "coa_name"]) ||
        shortId(row.account_id || row.cash_account_id),
      debit: formatMoney(pick(row, ["debit_amount", "debit"])),
      credit: formatMoney(pick(row, ["credit_amount", "credit"])),
      status: getStatus(row),
      attachment: getAttachment(row),
    };
  });
}

function buildFinanceRows({
  moduleKey,
  rows,
  cashAccountMap,
}: {
  moduleKey: FinanceModuleKey;
  rows: ModuleRow[];
  cashAccountMap: Record<string, ModuleRow>;
}) {
  if (moduleKey === "overview" || moduleKey === "transactions") {
    return buildTransactionRows(rows, cashAccountMap);
  }

  if (moduleKey === "invoices") {
    return buildInvoiceRows(rows);
  }

  if (moduleKey === "cashflow") {
    return buildCashflowRows(rows);
  }

  if (moduleKey === "taxes") {
    return buildTaxRows(rows);
  }

  if (moduleKey === "ledger") {
    return buildLedgerRows(rows);
  }

  return rows;
}

export function useFinanceModule(moduleKey: FinanceModuleKey) {
  const selectedCompanyId = useCompanyScope();

  return useQuery<ModuleData>({
    queryKey: ["finance", moduleKey, selectedCompanyId],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = getScopedQueryParams("finance");
      const currentEndpoint = getModuleEndpoint("finance", moduleKey);

      const [
        currentRows,
        transactions,
        invoices,
        cashflows,
        taxes,
        ledger,
        cashAccounts,
      ] = await Promise.all([
        safeGet(currentEndpoint, params),
        safeGet("/api/v1/finance/transactions", params),
        safeGet("/api/v1/finance/invoices", params),
        safeGet("/api/v1/finance/cashflow-snapshots", params),
        safeGet("/api/v1/finance/tax-records", params),
        safeGet("/api/v1/finance/journal-entries", params),
        fetchCashAccounts(params),
      ]);

      const cashAccountMap = toMap(cashAccounts);

      const rows = buildFinanceRows({
        moduleKey,
        rows: currentRows,
        cashAccountMap,
      });

      return {
        metrics: buildFinanceMetrics({
          transactions,
          invoices,
          cashflows,
          taxes,
        }),
        rows,
        aiNotes: [
          "Finance data mengikuti company scope. Superadmin bisa filter company, owner fixed ke company akun.",
          "Cash account transaksi dibaca dari cash_account_id dan ditampilkan sebagai account name.",
          "Gunakan attachment/proof untuk menyimpan bukti transaksi, invoice, tax, atau journal.",
          ledger.length > 0
            ? "Ledger sudah memiliki data jurnal untuk laporan finance."
            : "Ledger masih kosong. Tambahkan journal entries untuk pembukuan yang lebih lengkap.",
        ],
      };
    },
  });
}