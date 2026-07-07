import { api } from "@/lib/api";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";
import type { ModuleFieldOption } from "@/types/modules";

type RawRow = Record<string, unknown>;

export const relatedLookupEndpoints: Record<string, string> = {
  employee_id: "/api/v1/hr/employees",
  reviewer_id: "/api/v1/hr/employees",
  approved_by: "/api/v1/hr/employees",
  assigned_to: "/api/v1/hr/employees",

  leave_type_id: "/api/v1/hr/leave-types",

  cash_account_id: "/api/v1/finance/cash-accounts",
  period_id: "/api/v1/finance/accounting-periods",
  tax_rate_id: "/api/v1/finance/tax-rates",
  transaction_id: "/api/v1/finance/transactions",

  lead_id: "/api/v1/crm/leads",
  contact_id: "/api/v1/crm/contacts",
  deal_id: "/api/v1/crm/deals",

  category_id: "/api/v1/products/categories",
  parent_category_id: "/api/v1/products/categories",
  supplier_id: "/api/v1/products/suppliers",
  product_id: "/api/v1/products/items",
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function isValidUuid(value: string | undefined | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value
  );
}

export function getDefaultCompanyId() {
  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  if (
    currentCompanyId &&
    isValidUuid(currentCompanyId) &&
    !isCurrentUserSuperAdmin()
  ) {
    return currentCompanyId;
  }

  if (
    selectedCompanyId &&
    selectedCompanyId !== "all" &&
    isValidUuid(selectedCompanyId)
  ) {
    return selectedCompanyId;
  }

  return "";
}

function normalizeRows(data: unknown): RawRow[] {
  if (Array.isArray(data)) return data as RawRow[];

  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;

  if (Array.isArray(record.data)) return record.data as RawRow[];
  if (Array.isArray(record.items)) return record.items as RawRow[];
  if (Array.isArray(record.results)) return record.results as RawRow[];
  if (Array.isArray(record.rows)) return record.rows as RawRow[];
  if (Array.isArray(record.records)) return record.records as RawRow[];

  return [];
}

function getOptionLabel(row: RawRow) {
  const employeeNo = row.employee_no;
  const sku = row.sku;
  const code = row.code;
  const accountNumber = row.account_number ?? row.number;

  const label =
    row.full_name ??
    row.name ??
    row.employee_name ??
    row.company_name ??
    row.branch_name ??
    row.category_name ??
    row.product_name ??
    row.supplier_name ??
    row.cash_account_name ??
    row.account_name ??
    row.bank_name ??
    row.title ??
    row.invoice_no ??
    row.transaction_no ??
    row.journal_no ??
    row.tax_type ??
    row.email ??
    row.phone ??
    row.id ??
    "-";

  if (hasValue(employeeNo)) return `${String(label)} (${String(employeeNo)})`;
  if (hasValue(sku)) return `${String(label)} (${String(sku)})`;
  if (hasValue(code)) return `${String(label)} (${String(code)})`;
  if (hasValue(accountNumber)) return `${String(label)} - ${String(accountNumber)}`;

  return String(label);
}

export function rowsToOptions(rows: RawRow[]): ModuleFieldOption[] {
  return rows
    .map((row) => {
      const id = row.id;

      if (typeof id !== "string") return null;

      return {
        value: id,
        label: getOptionLabel(row),
      };
    })
    .filter((item): item is ModuleFieldOption => Boolean(item));
}

async function fetchApiRows(
  endpoint: string,
  params?: Record<string, unknown>,
  options?: {
    silent?: boolean;
  }
): Promise<RawRow[]> {
  try {
    const response = await api.get(endpoint, {
      params,
    });

    return normalizeRows(response.data);
  } catch (error) {
    if (!options?.silent) {
      console.warn(`Failed to fetch lookup ${endpoint}:`, error);
    }

    return [];
  }
}

export async function fetchCompanies() {
  return fetchApiRows("/api/v1/companies", {
    limit: 100,
    sort_by: "name",
    sort_order: "asc",
  });
}

export async function fetchBranchesByCompany(companyId: string) {
  if (!isValidUuid(companyId)) return [];

  const candidates = [
    {
      endpoint: `/api/v1/companies/${companyId}/branches`,
      params: {},
    },
    {
      endpoint: "/api/v1/branches",
      params: {
        company_id: companyId,
      },
    },
  ];

  for (const candidate of candidates) {
    const rows = await fetchApiRows(candidate.endpoint, candidate.params, {
      silent: true,
    });

    if (rows.length > 0) return rows;
  }

  return [];
}

function getSortByForLookup(key: string) {
  if (key === "employee_id") return "full_name";
  if (key === "reviewer_id") return "full_name";
  if (key === "approved_by") return "full_name";
  if (key === "assigned_to") return "full_name";
  if (key === "category_id") return "name";
  if (key === "parent_category_id") return "name";
  if (key === "supplier_id") return "name";
  if (key === "product_id") return "name";

  return "created_at";
}

export async function fetchRelatedRows(
  key: string,
  companyId?: string
) {
  const endpoint = relatedLookupEndpoints[key];

  if (!endpoint) return [];

  const params: Record<string, unknown> = {
    limit: 100,
    sort_by: getSortByForLookup(key),
    sort_order: "asc",
  };

  if (companyId && isValidUuid(companyId)) {
    params.company_id = companyId;
  }

  return fetchApiRows(endpoint, params);
}