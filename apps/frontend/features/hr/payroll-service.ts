import { api } from "@/lib/api";
import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";
import {
  idempotencyHeaders,
  retainIdempotencyKey,
} from "@/lib/idempotency";
import type { ModuleRow } from "@/types/modules";

type PayrollMode = "create" | "update";
type PayrollBody = Record<string, unknown>;

const PAYROLL_ENDPOINT = "/api/v1/hr/payroll-runs";

function hasValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getPayloadCompanyId(payload: ModuleRow): string | undefined {
  const currentCompanyId = getCurrentCompanyId();

  if (
    currentCompanyId &&
    isValidUuid(currentCompanyId) &&
    !isCurrentUserSuperAdmin()
  ) {
    return currentCompanyId;
  }

  const selectedCompanyId = getSelectedCompanyId();

  if (
    selectedCompanyId &&
    selectedCompanyId !== "all" &&
    isValidUuid(selectedCompanyId)
  ) {
    return selectedCompanyId;
  }

  const formCompanyId = String(payload.company_id ?? "").trim();

  if (isValidUuid(formCompanyId)) {
    return formCompanyId;
  }

  return undefined;
}

function preparePayrollBody(
  payload: ModuleRow,
  mode: PayrollMode
): PayrollBody {
  const body: PayrollBody = {};

  if (mode === "create") {
    const companyId = getPayloadCompanyId(payload);

    if (!companyId) {
      throw new Error("Company wajib dipilih.");
    }

    body.company_id = companyId;
  }

  const branchId = String(payload.branch_id ?? "").trim();

  if (branchId && isValidUuid(branchId)) {
    body.branch_id = branchId;
  }

  if (hasValue(payload.payroll_no)) {
    body.payroll_no = String(payload.payroll_no).trim();
  } else if (mode === "create") {
    throw new Error("Payroll No wajib diisi.");
  }

  if (hasValue(payload.period_start)) {
    body.period_start = String(payload.period_start).trim();
  } else if (mode === "create") {
    throw new Error("Period Start wajib diisi.");
  }

  if (hasValue(payload.period_end)) {
    body.period_end = String(payload.period_end).trim();
  } else if (mode === "create") {
    throw new Error("Period End wajib diisi.");
  }

  /*
   * Payroll amounts and status are owned by the backend calculation workflow.
   * The create/edit form only defines scope and period so attendance/KPI rules
   * cannot be bypassed by sending manual totals from the browser.
   */
  if (mode === "create") {
    body.status = "draft";
  }

  return body;
}

export async function createPayrollRun(payload: ModuleRow) {
  const body = preparePayrollBody(payload, "create");

  const operation = `POST:${PAYROLL_ENDPOINT}`;
  const { key, headers } = idempotencyHeaders(operation, body);

  const response = await api.post(PAYROLL_ENDPOINT, body, { headers });
  retainIdempotencyKey(operation, body, key);

  return response.data;
}

export async function updatePayrollRun(
  id: string,
  payload: ModuleRow
) {
  if (!id) {
    throw new Error("Payroll ID tidak ditemukan.");
  }

  const body = preparePayrollBody(payload, "update");

  const response = await api.patch(
    `${PAYROLL_ENDPOINT}/${id}`,
    body
  );

  return response.data;
}

export async function calculatePayrollRun(id: string) {
  if (!id) {
    throw new Error("Payroll ID tidak ditemukan.");
  }

  const endpoint = `${PAYROLL_ENDPOINT}/${id}/calculate`;
  const operation = `POST:${endpoint}`;
  const { key, headers } = idempotencyHeaders(operation, {});
  const response = await api.post(endpoint, {}, { headers });
  retainIdempotencyKey(operation, {}, key);
  return response.data;
}
