import { api } from "@/lib/api";
import { isEndpointFallbackError } from "@/lib/api-error";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";
import type { ModuleFieldOption } from "@/types/modules";

export type RawLookupRow = Record<string, unknown>;

export type LookupContext = {
  productId?: string;
  moduleKey?: string;
  mode?: "create" | "edit";
};

const lookupEndpointMap: Record<string, string[]> = {
  company_id: ["/api/v1/companies"],
  employee_id: ["/api/v1/hr/employees"],
  reviewer_id: ["/api/v1/hr/employees"],
  reviewer_user_id: ["/api/v1/hr/employees"],
  approved_by: ["/api/v1/hr/employees"],
  approved_by_id: ["/api/v1/hr/employees"],
  assigned_to: ["/api/v1/hr/employees"],
  assigned_by_id: ["/api/v1/hr/employees"],
  leave_type_id: ["/api/v1/hr/leave-types", "/api/v1/hr/leave_types"],
  product_id: ["/api/v1/products/items", "/api/v1/products"],
  category_id: ["/api/v1/products/categories"],
  parent_category_id: ["/api/v1/products/categories"],
  supplier_id: ["/api/v1/products/suppliers"],
  cash_account_id: ["/api/v1/finance/cash-accounts"],
  transaction_id: ["/api/v1/finance/transactions"],
  period_id: ["/api/v1/finance/accounting-periods", "/api/v1/finance/periods"],
  tax_rate_id: ["/api/v1/finance/tax-rates"],
  lead_id: ["/api/v1/crm/leads"],
  contact_id: ["/api/v1/crm/contacts"],
  deal_id: ["/api/v1/crm/deals"],
};

const employeeLookupKeys = new Set([
  "employee_id",
  "reviewer_id",
  "reviewer_user_id",
  "approved_by",
  "approved_by_id",
  "assigned_to",
  "assigned_by_id",
]);

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function isValidUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getDefaultCompanyId(): string {
  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  if (
    currentCompanyId
    && isValidUuid(currentCompanyId)
    && !isCurrentUserSuperAdmin()
  ) {
    return currentCompanyId;
  }

  if (
    selectedCompanyId
    && selectedCompanyId !== "all"
    && isValidUuid(selectedCompanyId)
  ) {
    return selectedCompanyId;
  }

  return "";
}

function normalizeRows(data: unknown): RawLookupRow[] {
  if (Array.isArray(data)) return data as RawLookupRow[];
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const preferredKeys = [
    "items", "data", "results", "rows", "records", "companies", "branches",
    "employees", "leave_types", "leaveTypes", "products", "categories",
    "suppliers", "cash_accounts", "transactions", "periods", "tax_rates",
    "leads", "contacts", "deals",
  ];

  for (const key of preferredKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value as RawLookupRow[];
    if (value && typeof value === "object") {
      const nested = normalizeRows(value);
      if (nested.length) return nested;
    }
  }

  const firstArray = Object.values(record).find(Array.isArray);
  return Array.isArray(firstArray) ? firstArray as RawLookupRow[] : [];
}

function pick(row: RawLookupRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (hasValue(value)) return String(value);
  }
  return "";
}

function getOptionId(row: RawLookupRow): string {
  return pick(row, [
    "id", "uuid", "value", "company_id", "branch_id", "employee_id",
    "leave_type_id", "product_id", "category_id", "supplier_id",
    "cash_account_id", "transaction_id", "period_id", "tax_rate_id",
    "lead_id", "contact_id", "deal_id",
  ]);
}

function getOptionLabel(row: RawLookupRow, key: string): string {
  const label = pick(row, [
    "full_name", "employee_name", "name", "leave_type_name", "company_name",
    "branch_name", "product_name", "category_name", "supplier_name",
    "cash_account_name", "account_name", "bank_name", "title", "invoice_no",
    "transaction_no", "journal_no", "tax_type", "email", "phone", "code", "id",
  ]) || "-";
  const employeeNo = pick(row, ["employee_no", "employee_code"]);
  const code = pick(row, ["code"]);
  const sku = pick(row, ["sku"]);
  const accountNumber = pick(row, ["account_number", "number"]);

  if (employeeLookupKeys.has(key) && employeeNo) return `${label} (${employeeNo})`;
  if (key === "product_id" && sku) return `${label} (${sku})`;
  if (accountNumber) return `${label} - ${accountNumber}`;
  if (code && code !== label) return `${label} (${code})`;
  return label;
}

export function rowsToOptions(
  rows: RawLookupRow[],
  key: string,
): ModuleFieldOption[] {
  return rows
    .map((row) => {
      const value = getOptionId(row);
      return value ? { value, label: getOptionLabel(row, key) } : null;
    })
    .filter((item): item is ModuleFieldOption => Boolean(item));
}

function getSortBy(key: string): string {
  if (employeeLookupKeys.has(key)) return "full_name";
  if ([
    "leave_type_id", "product_id", "category_id", "parent_category_id",
    "supplier_id", "company_id", "branch_id",
  ].includes(key)) return "name";
  return "created_at";
}

async function fetchRows(
  endpoints: string[],
  params?: Record<string, unknown>,
): Promise<RawLookupRow[]> {
  let lastFallbackError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint, { params });
      const rows = normalizeRows(response.data);
      if (rows.length) return rows;
    } catch (error: unknown) {
      if (!isEndpointFallbackError(error)) throw error;
      lastFallbackError = error;
    }
  }

  // Endpoint optional yang benar-benar tidak tersedia dianggap lookup kosong.
  void lastFallbackError;
  return [];
}

export async function fetchOptionsForField(
  key: string,
  companyId: string,
  context: LookupContext = {},
): Promise<ModuleFieldOption[]> {
  if (key === "branch_id") {
    if (!isValidUuid(companyId)) return [];

    if (isValidUuid(context.productId)) {
      const rows = await fetchRows(
        [`/api/v1/products/items/${context.productId}/available-branches`],
        {
          company_id: companyId,
          purpose: context.moduleKey === "stock" && context.mode !== "edit" ? "stock_create" : "usage",
        },
      );
      return rowsToOptions(rows, key);
    }

    const rows = await fetchRows(
      [`/api/v1/companies/${companyId}/branches`, "/api/v1/branches"],
      { company_id: companyId, limit: 100, sort_by: "name", sort_order: "asc" },
    );
    return rowsToOptions(rows, key);
  }

  const endpoints = lookupEndpointMap[key];
  if (!endpoints) return [];

  const params: Record<string, unknown> = {
    limit: 100,
    sort_by: getSortBy(key),
    sort_order: "asc",
  };
  if (companyId && key !== "company_id") params.company_id = companyId;

  let rows = await fetchRows(endpoints, params);
  if (
    rows.length === 0
    && (employeeLookupKeys.has(key) || key === "leave_type_id")
    && companyId
  ) {
    rows = await fetchRows(endpoints, {
      limit: 100,
      sort_by: getSortBy(key),
      sort_order: "asc",
    });
  }

  return rowsToOptions(rows, key);
}
