import { api } from "@/lib/api";
import type {
  AutomationBranch,
  AutomationContext,
  AutomationMonitoringRow,
  AutomationProduct,
  AutomationRule,
  AutomationStock,
  DomainEvent,
  SalesOrder,
  SalesOrderLineInput,
} from "./types";


type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    total_pages?: number;
  };
};

function rowsFrom<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const candidates = [record.data, record.items, record.results, record.rows];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as T[];
    if (candidate && typeof candidate === "object") {
      const nested = rowsFrom<T>(candidate);
      if (nested.length) return nested;
    }
  }

  return [];
}


async function getAllPaginatedRows<T>(
  endpoint: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  const first = await api.get<PaginatedResponse<T>>(endpoint, {
    params: { ...params, page: 1, limit: 100 },
  });
  const firstRows = rowsFrom<T>(first.data);
  const totalPages = Math.max(Number(first.data.meta?.total_pages ?? 1), 1);
  if (totalPages <= 1) return firstRows;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.get<PaginatedResponse<T>>(endpoint, {
        params: { ...params, page: index + 2, limit: 100 },
      }),
    ),
  );
  return [firstRows, ...remaining.map((response) => rowsFrom<T>(response.data))].flat();
}

function createIdempotencyKey(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${random}`;
}

export async function getAutomationContext(
  companyId: string
): Promise<AutomationContext> {
  const [products, stocks, branchesResponse] = await Promise.all([
    getAllPaginatedRows<AutomationProduct>(
      "/api/v1/products/items",
      { company_id: companyId, is_active: true, sort_by: "name", sort_order: "asc" },
    ),
    getAllPaginatedRows<AutomationStock>(
      "/api/v1/products/stocks",
      { company_id: companyId, sort_by: "updated_at", sort_order: "desc" },
    ),
    api.get<AutomationBranch[] | PaginatedResponse<AutomationBranch>>(
      `/api/v1/companies/${companyId}/branches`,
    ),
  ]);

  return {
    products: [...products].sort((a, b) => a.name.localeCompare(b.name, "id")),
    stocks,
    branches: rowsFrom<AutomationBranch>(branchesResponse.data)
      .sort((a, b) => a.name.localeCompare(b.name, "id")),
  };
}

export async function getSalesOrders(companyId: string) {
  const response = await api.get<PaginatedResponse<SalesOrder>>(
    "/api/v1/automation/sales-orders",
    { params: { company_id: companyId, page: 1, limit: 100 } }
  );

  return rowsFrom<SalesOrder>(response.data);
}

export async function getAutomationEvents(companyId: string) {
  const response = await api.get<DomainEvent[]>(
    "/api/v1/automation/events",
    { params: { company_id: companyId, limit: 100 } }
  );

  return rowsFrom<DomainEvent>(response.data);
}

export async function createSalesOrder(input: {
  company_id: string;
  branch_id: string;
  customer_name: string;
  due_date?: string;
  auto_process: boolean;
  notes?: string;
  items: SalesOrderLineInput[];
}) {
  const response = await api.post<SalesOrder>(
    "/api/v1/automation/sales-orders",
    {
      ...input,
      creation_mode: "manual",
    },
    {
      headers: {
        "Idempotency-Key": createIdempotencyKey("sales-order-create"),
      },
    }
  );

  return response.data;
}

export async function processSalesOrder(input: {
  companyId: string;
  orderId: string;
}) {
  const response = await api.post<SalesOrder>(
    `/api/v1/automation/sales-orders/${input.orderId}/process`,
    {},
    {
      params: { company_id: input.companyId },
      headers: {
        "Idempotency-Key": createIdempotencyKey("sales-order-process"),
      },
    }
  );

  return response.data;
}

export async function getAutomationMonitoring(companyId: string) {
  const response = await api.get<AutomationMonitoringRow[]>(
    "/api/v1/automation/monitoring",
    {
      params: {
        company_id: companyId,
        limit: 200,
      },
    }
  );

  return rowsFrom<AutomationMonitoringRow>(response.data);
}

export async function confirmSalesOrderPayment(input: {
  companyId: string;
  orderId: string;
}) {
  const response = await api.post<AutomationMonitoringRow>(
    `/api/v1/automation/sales-orders/${input.orderId}/confirm-payment`,
    {},
    {
      params: { company_id: input.companyId },
      headers: {
        "Idempotency-Key": createIdempotencyKey("sales-order-payment"),
      },
    }
  );

  return response.data;
}



export async function getAutomationRules() {
  const response = await api.get<AutomationRule[]>(
    "/api/v1/automation/rules",
  );
  return rowsFrom<AutomationRule>(response.data);
}
