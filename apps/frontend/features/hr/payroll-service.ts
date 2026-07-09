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

const validStatuses = new Set([
  "draft",
  "calculated",
  "approved",
  "paid",
  "cancelled",
]);

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

function parseNumberValue(value: unknown): number | undefined {
  if (!hasValue(value)) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const raw = String(value)
    .replace(/Rp/gi, "")
    .replace(/IDR/gi, "")
    .replace(/\s/g, "")
    .trim();

  if (!raw) {
    return undefined;
  }

  const cleaned = raw.replace(/[^\d.,-]/g, "");

  if (!cleaned) {
    return undefined;
  }

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    const parts = cleaned.split(",");

    normalized =
      parts.length === 2 && parts[1].length <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    const parts = cleaned.split(".");

    /*
     * 58000000.00 = angka decimal backend
     * 58.000.000 = format ribuan Indonesia
     */
    normalized =
      parts.length === 2 && parts[1].length <= 2
        ? cleaned
        : cleaned.replace(/\./g, "");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
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

function normalizeStatus(value: unknown): string {
  const normalized = String(value ?? "draft")
    .trim()
    .toLowerCase();

  return validStatuses.has(normalized)
    ? normalized
    : "draft";
}

function assignNumber(
  body: PayrollBody,
  key: string,
  value: unknown,
  options?: {
    required?: boolean;
    defaultValue?: number;
  }
) {
  const parsed = parseNumberValue(value);

  if (parsed !== undefined) {
    body[key] = parsed;
    return;
  }

  if (options?.defaultValue !== undefined) {
    body[key] = options.defaultValue;
    return;
  }

  if (options?.required) {
    throw new Error(`${key} wajib diisi dengan angka yang valid.`);
  }
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
   * Database menggunakan total_deductions, plural.
   * total_deduction hanya diterima sebagai fallback dari kode lama.
   */
  const deductions =
    payload.total_deductions ??
    payload.total_deduction ??
    payload.deduction;

  assignNumber(body, "total_gross", payload.total_gross, {
    required: mode === "create",
  });

  assignNumber(body, "total_deductions", deductions, {
    defaultValue: mode === "create" ? 0 : undefined,
  });

  assignNumber(body, "total_tax", payload.total_tax, {
    defaultValue: mode === "create" ? 0 : undefined,
  });

  assignNumber(body, "total_net", payload.total_net, {
    required: mode === "create",
  });

  if (hasValue(payload.status) || mode === "create") {
    body.status = normalizeStatus(payload.status);
  }

  console.log("[Payroll Payload]", {
    mode,
    body,
  });

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