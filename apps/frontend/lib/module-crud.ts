import { api } from "@/lib/api";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";
import type { ModuleRow } from "@/types/modules";

export type FeatureKey = "product" | "hr" | "crm" | "finance" | "admin";

type EndpointMap = Record<string, string>;

const endpointMap: Record<FeatureKey, EndpointMap> = {
  product: {
    overview: "/api/v1/products/items",
    categories: "/api/v1/products/categories",
    stock: "/api/v1/products/stocks",
    suppliers: "/api/v1/products/suppliers",
  },

  hr: {
    overview: "/api/v1/hr/employees",
    employees: "/api/v1/hr/employees",
    attendance: "/api/v1/hr/attendance",
    leave: "/api/v1/hr/leave-requests",
    kpi: "/api/v1/hr/kpi-reviews",
    payroll: "/api/v1/hr/payroll-runs",
  },

  crm: {
    overview: "/api/v1/crm/leads",
    leads: "/api/v1/crm/leads",
    customers: "/api/v1/crm/contacts",
    contacts: "/api/v1/crm/contacts",
    pipeline: "/api/v1/crm/deals",
    deals: "/api/v1/crm/deals",
    campaigns: "/api/v1/crm/campaigns",
  },

  finance: {
    overview: "/api/v1/finance/transactions",
    transactions: "/api/v1/finance/transactions",
    invoices: "/api/v1/finance/invoices",
    cashflow: "/api/v1/finance/cashflow-snapshots",
    taxes: "/api/v1/finance/tax-records",
    ledger: "/api/v1/finance/journal-entries",
  },

  admin: {
    companies: "/api/v1/companies",
    users: "/api/v1/users",
    settings: "/api/v1/admin/settings",
  },
};

const companyScopedFeatures: FeatureKey[] = ["product", "hr", "crm", "finance"];

const numericKeys = new Set([
  "cost_price",
  "selling_price",
  "quantity_on_hand",
  "reserved_quantity",
  "reorder_point",
  "subtotal_amount",
  "discount_amount",
  "tax_amount",
  "total_amount",
  "paid_amount",
  "amount",
  "score",
  "salary",
  "target_value",
  "actual_value",
  "weight_percent",
  "lead_time_days",
]);

const booleanKeys = new Set([
  "track_stock",
  "is_active",
  "is_default",
  "is_balanced",
]);

const uuidKeys = new Set([
  "id",
  "company_id",
  "branch_id",
  "category_id",
  "created_by_id",
  "parent_category_id",
  "product_id",
  "employee_id",
  "transaction_id",
  "period_id",
  "cash_account_id",
  "tax_rate_id",
  "supplier_id",
  "customer_id",
  "lead_id",
  "deal_id",
]);

const readonlyKeys = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by_id",

  "photo",
  "category",
  "stock",
  "price",
  "products",
  "revenue",
  "product",
  "branch",
  "reserved",
  "reorder",
  "leadTime",
]);

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function cleanValue(key: string, value: string) {
  const trimmedValue = String(value ?? "").trim();

  if (trimmedValue === "") return undefined;

  if (uuidKeys.has(key)) {
    if (!isValidUuid(trimmedValue)) return undefined;
    return trimmedValue;
  }

  if (booleanKeys.has(key)) {
    return trimmedValue === "true";
  }

  if (numericKeys.has(key)) {
    const numberValue = Number(trimmedValue);

    if (Number.isNaN(numberValue)) return undefined;

    return numberValue;
  }

  return trimmedValue;
}

function cleanPayload(payload: ModuleRow) {
  const result: Record<string, unknown> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (readonlyKeys.has(key)) return;

    const cleanedValue = cleanValue(key, value);

    if (cleanedValue === undefined) return;

    result[key] = cleanedValue;
  });

  return result;
}

function stripReadonlyFields(payload: Record<string, unknown>) {
  const clone = { ...payload };

  readonlyKeys.forEach((key) => {
    delete clone[key];
  });

  return clone;
}

export function getModuleEndpoint(featureKey: FeatureKey, moduleKey?: string) {
  const endpoint = endpointMap[featureKey]?.[moduleKey ?? "overview"];

  if (!endpoint) {
    throw new Error(`Endpoint belum dibuat untuk ${featureKey}/${moduleKey}`);
  }

  return endpoint;
}

function getActiveCompanyIdForRead() {
  if (isCurrentUserSuperAdmin()) {
    const selectedCompanyId = getSelectedCompanyId();

    if (
      selectedCompanyId &&
      selectedCompanyId !== "all" &&
      isValidUuid(selectedCompanyId)
    ) {
      return selectedCompanyId;
    }

    return null;
  }

  const currentCompanyId = getCurrentCompanyId();

  if (currentCompanyId && isValidUuid(currentCompanyId)) {
    return currentCompanyId;
  }

  return null;
}

function getActiveCompanyIdForWrite() {
  if (isCurrentUserSuperAdmin()) {
    const selectedCompanyId = getSelectedCompanyId();

    if (
      selectedCompanyId &&
      selectedCompanyId !== "all" &&
      isValidUuid(selectedCompanyId)
    ) {
      return selectedCompanyId;
    }

    return null;
  }

  const currentCompanyId = getCurrentCompanyId();

  if (currentCompanyId && isValidUuid(currentCompanyId)) {
    return currentCompanyId;
  }

  return null;
}

export function getScopedQueryParams(
  featureKey: FeatureKey,
  params: Record<string, unknown> = {}
) {
  if (!companyScopedFeatures.includes(featureKey)) {
    return params;
  }

  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  /**
   * Owner/admin/user company:
   * kalau punya company_id dan bukan superadmin,
   * data wajib fixed ke company dia.
   */
  if (
    currentCompanyId &&
    isValidUuid(currentCompanyId) &&
    !isCurrentUserSuperAdmin()
  ) {
    return {
      ...params,
      company_id: currentCompanyId,
    };
  }

  /**
   * Superadmin:
   * kalau pilih company tertentu dari filter.
   */
  if (
    selectedCompanyId &&
    selectedCompanyId !== "all" &&
    isValidUuid(selectedCompanyId)
  ) {
    return {
      ...params,
      company_id: selectedCompanyId,
    };
  }

  /**
   * Superadmin + All Companies:
   * tidak kirim company_id.
   */
  return params;
}

function withCompanyId(featureKey: FeatureKey, payload: ModuleRow) {
  const cleaned = cleanPayload(payload);

  if (!companyScopedFeatures.includes(featureKey)) {
    return cleaned;
  }

  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  /**
   * Owner/admin/user company:
   * new record otomatis masuk company dia.
   */
  if (
    currentCompanyId &&
    isValidUuid(currentCompanyId) &&
    !isCurrentUserSuperAdmin()
  ) {
    return {
      ...cleaned,
      company_id: currentCompanyId,
    };
  }

  /**
   * Superadmin:
   * kalau filter company aktif, pakai company dari filter.
   */
  if (
    selectedCompanyId &&
    selectedCompanyId !== "all" &&
    isValidUuid(selectedCompanyId)
  ) {
    return {
      ...cleaned,
      company_id: selectedCompanyId,
    };
  }

  /**
   * Superadmin:
   * kalau company dipilih dari modal.
   */
  if (
    typeof cleaned.company_id === "string" &&
    isValidUuid(cleaned.company_id)
  ) {
    return cleaned;
  }

  return cleaned;
}

export async function createModuleRecord({
  featureKey,
  moduleKey,
  payload,
}: {
  featureKey: FeatureKey;
  moduleKey?: string;
  payload: ModuleRow;
}) {
  const endpoint = getModuleEndpoint(featureKey, moduleKey);
  const body = stripReadonlyFields(withCompanyId(featureKey, payload));

  const response = await api.post(endpoint, body);
  return response.data;
}

export async function updateModuleRecord({
  featureKey,
  moduleKey,
  id,
  payload,
}: {
  featureKey: FeatureKey;
  moduleKey?: string;
  id: string;
  payload: ModuleRow;
}) {
  const endpoint = getModuleEndpoint(featureKey, moduleKey);
  const body = stripReadonlyFields(cleanPayload(payload));

  const response = await api.patch(`${endpoint}/${id}`, body);
  return response.data;
}

export async function deleteModuleRecord({
  featureKey,
  moduleKey,
  id,
}: {
  featureKey: FeatureKey;
  moduleKey?: string;
  id: string;
}) {
  const endpoint = getModuleEndpoint(featureKey, moduleKey);

  await api.delete(`${endpoint}/${id}`);
}