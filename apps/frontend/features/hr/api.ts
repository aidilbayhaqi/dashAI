import { api } from "@/lib/api";
import { getScopedQueryParams } from "@/lib/module-crud";
import type { ModuleMetric, ModuleRow } from "@/types/modules";
import type { HRModuleKey } from "./types";

type GetHRModuleDataParams =
  | HRModuleKey
  | {
      moduleKey: HRModuleKey;
      companyId?: string;
    };

type ApiListResponse = Record<string, unknown>;

const endpointMap: Record<HRModuleKey, string[]> = {
  employees: ["/api/v1/hr/employees", "/api/v1/hr/employees/"],

  attendance: ["/api/v1/hr/attendance", "/api/v1/hr/attendance/"],

  "leave-types": [
    "/api/v1/hr/leave-types",
    "/api/v1/hr/leave-types/",
    "/api/v1/hr/leave_types",
  ],

  "leave-requests": [
    "/api/v1/hr/leave-requests",
    "/api/v1/hr/leave-requests/",
    "/api/v1/hr/leave_requests",
  ],

  tasks: ["/api/v1/hr/tasks", "/api/v1/hr/tasks/"],

  "payroll-runs": [
    "/api/v1/hr/payroll-runs",
    "/api/v1/hr/payroll-runs/",
    "/api/v1/hr/payroll_runs",
    "/api/v1/hr/payroll",
  ],

  "kpi-reviews": [
    "/api/v1/hr/kpi-reviews",
    "/api/v1/hr/kpi-reviews/",
    "/api/v1/hr/kpi_reviews",
  ],
};

const sortMap: Record<HRModuleKey, string> = {
  employees: "updated_at",
  attendance: "updated_at",
  "leave-types": "updated_at",
  "leave-requests": "updated_at",
  tasks: "updated_at",
  "payroll-runs": "updated_at",
  "kpi-reviews": "updated_at",
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function pickRaw(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) return String(value);
  }

  return "";
}

function toModuleRow(row: unknown): ModuleRow {
  if (!row || typeof row !== "object") return {};

  const source = row as Record<string, unknown>;
  const result: ModuleRow = {};

  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      result[key] = "";
      return;
    }

    if (typeof value === "object") {
      const display = pickRaw(value as Record<string, unknown>, [
        "full_name",
        "employee_name",
        "name",
        "code",
        "email",
        "title",
        "label",
        "value",
      ]);

      result[key] = display || JSON.stringify(value);
      return;
    }

    result[key] = String(value);
  });

  return result;
}

function normalizeRows(data: unknown): ModuleRow[] {
  if (Array.isArray(data)) return data.map(toModuleRow);

  if (!data || typeof data !== "object") return [];

  const record = data as ApiListResponse;

  const arrayKeys = [
    "items",
    "data",
    "results",
    "rows",
    "records",

    "employees",
    "employee",

    "attendance",
    "attendances",

    "leave_types",
    "leaveTypes",
    "leave_type",
    "leaveTypesData",

    "leave_requests",
    "leaveRequests",
    "leave_request",

    "tasks",

    "payroll_runs",
    "payrollRuns",
    "payrolls",
    "payroll",
    "runs",

    "kpi_reviews",
    "kpiReviews",
    "reviews",
  ];

  for (const key of arrayKeys) {
    const value = record[key];

    if (Array.isArray(value)) return value.map(toModuleRow);

    if (value && typeof value === "object") {
      const nested = normalizeRows(value);

      if (nested.length > 0) return nested;
    }
  }

  const firstArray = Object.values(record).find((value) => Array.isArray(value));

  if (Array.isArray(firstArray)) return firstArray.map(toModuleRow);

  return [];
}

function pick(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) return String(value);
  }

  return "";
}

function parseNumber(value: unknown) {
  if (!hasValue(value)) return null;

  const raw = String(value)
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "")
    .trim();

  if (!raw) return null;

  const cleaned = raw.replace(/[^\d.,-]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastCommaIndex = cleaned.lastIndexOf(",");
    const lastDotIndex = cleaned.lastIndexOf(".");

    normalized =
      lastCommaIndex > lastDotIndex
        ? cleaned.replaceAll(".", "").replace(",", ".")
        : cleaned.replaceAll(",", "");
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");

    normalized =
      parts.length === 2 && parts[1].length <= 2
        ? cleaned
        : cleaned.replaceAll(".", "");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatRupiah(value: unknown) {
  const parsed = parseNumber(value);

  if (parsed === null) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parsed);
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

function formatDateTime(value: unknown) {
  if (!hasValue(value)) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusText(value: unknown) {
  if (!hasValue(value)) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function boolText(value: unknown) {
  const normalized = String(value ?? "").toLowerCase();

  if (["true", "1", "yes", "paid", "active"].includes(normalized)) {
    return "Yes";
  }

  if (["false", "0", "no", "unpaid", "inactive"].includes(normalized)) {
    return "No";
  }

  return statusText(value);
}

function buildIndex(rows: ModuleRow[]) {
  const index: Record<string, ModuleRow> = {};

  rows.forEach((row) => {
    const id = pick(row, ["id"]);

    if (id) index[id] = row;
  });

  return index;
}

function getEmployeeName(
  row: ModuleRow,
  employeeIndex: Record<string, ModuleRow>
) {
  const direct = pick(row, [
    "employee_name",
    "employee_full_name",
    "full_name",
    "employee",
    "name",
  ]);

  if (direct) return direct;

  const employeeId = pick(row, ["employee_id"]);
  const employee = employeeIndex[employeeId];

  if (!employee) return employeeId || "-";

  return pick(employee, ["full_name", "name", "employee_name", "email"]) || "-";
}

function getLeaveTypeName(
  row: ModuleRow,
  leaveTypeIndex: Record<string, ModuleRow>
) {
  const direct = pick(row, [
    "leave_type_name",
    "leave_type",
    "type_name",
    "name",
  ]);

  if (direct) return direct;

  const leaveTypeId = pick(row, ["leave_type_id"]);
  const leaveType = leaveTypeIndex[leaveTypeId];

  if (!leaveType) return leaveTypeId || "-";

  return pick(leaveType, ["name", "leave_type_name", "code"]) || "-";
}

function normalizeEmployeeRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const employmentType = pick(row, ["employment_type", "type"]);
    const baseSalary = pick(row, ["base_salary", "salary", "basic_salary"]);

    return {
      ...row,
      employee_no: pick(row, ["employee_no", "code", "number"]) || "-",
      full_name: pick(row, ["full_name", "name", "employee_name"]) || "-",
      email: pick(row, ["email"]) || "-",
      phone: pick(row, ["phone"]) || "-",
      department_name: pick(row, ["department_name", "department"]) || "-",
      job_title: pick(row, ["job_title", "position", "role"]) || "-",

      employment_type: employmentType,
      employment_type_label: statusText(employmentType),
      type_label: statusText(employmentType),

      base_salary: baseSalary,
      base_salary_display: formatRupiah(baseSalary),

      status_label: statusText(pick(row, ["status"])),
    };
  });
}

function normalizeAttendanceRows(
  rows: ModuleRow[],
  employeeIndex: Record<string, ModuleRow>
) {
  return rows.map((row) => {
    const checkIn = pick(row, [
      "check_in_at",
      "clock_in",
      "check_in",
      "time_in",
    ]);

    const checkOut = pick(row, [
      "check_out_at",
      "clock_out",
      "check_out",
      "time_out",
    ]);

    const attendanceDate = pick(row, ["attendance_date", "date"]);

    return {
      ...row,
      employee_name: getEmployeeName(row, employeeIndex),

      attendance_date: attendanceDate,
      attendance_date_display: formatDate(attendanceDate),

      check_in_display: formatDateTime(checkIn),
      check_out_display: formatDateTime(checkOut),

      clock_in: formatDateTime(checkIn),
      clock_out: formatDateTime(checkOut),

      status_label: statusText(pick(row, ["status"])),
    };
  });
}

function normalizeLeaveTypeRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const isPaid = pick(row, ["is_paid", "paid"]);
    const isActive = pick(row, ["is_active", "active"]);

    return {
      ...row,
      code: pick(row, ["code"]) || "-",
      name: pick(row, ["name", "leave_type_name"]) || "-",

      default_days_per_year:
        pick(row, [
          "default_days_per_year",
          "max_days",
          "quota_days",
          "days",
        ]) || "0",

      is_paid_label: boolText(isPaid),
      is_active_label: boolText(isActive),
      status_label:
        String(isActive).toLowerCase() === "false" ? "Inactive" : "Active",
    };
  });
}

function normalizeLeaveRequestRows(
  rows: ModuleRow[],
  employeeIndex: Record<string, ModuleRow>,
  leaveTypeIndex: Record<string, ModuleRow>
) {
  return rows.map((row) => {
    const startDate = pick(row, ["start_date", "from_date"]);
    const endDate = pick(row, ["end_date", "to_date"]);

    return {
      ...row,
      employee_name: getEmployeeName(row, employeeIndex),
      leave_type_name: getLeaveTypeName(row, leaveTypeIndex),

      start_date: startDate,
      end_date: endDate,
      start_date_display: formatDate(startDate),
      end_date_display: formatDate(endDate),

      total_days: pick(row, ["total_days", "days"]) || "0",
      status_label: statusText(pick(row, ["status"])),
    };
  });
}

function normalizeTaskRows(
  rows: ModuleRow[],
  employeeIndex: Record<string, ModuleRow>
) {
  return rows.map((row) => ({
    ...row,
    employee_name: getEmployeeName(row, employeeIndex),
    title: pick(row, ["title", "name", "task_name"]) || "-",
    priority_label: statusText(pick(row, ["priority"])),
    due_date_display: formatDate(pick(row, ["due_date", "deadline"])),
    status_label: statusText(pick(row, ["status"])),
  }));
}

function normalizePayrollRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const periodStart = pick(row, [
      "period_start",
      "start_date",
      "from_date",
    ]);

    const periodEnd = pick(row, [
      "period_end",
      "end_date",
      "to_date",
    ]);

    const gross = pick(row, [
      "total_gross",
      "gross",
      "gross_amount",
      "gross_salary",
    ]);

    const deductions = pick(row, [
      "total_deductions",
      "total_deduction",
      "deductions",
      "deduction",
      "deduction_amount",
    ]);

    const tax = pick(row, [
      "total_tax",
      "tax",
      "tax_amount",
    ]);

    const net = pick(row, [
      "total_net",
      "net",
      "net_amount",
      "net_salary",
      "take_home_pay",
    ]);

    return {
      ...row,

      payroll_no:
        pick(row, ["payroll_no", "code", "number", "reference_no"]) || "-",

      period_start: periodStart,
      period_end: periodEnd,

      period_start_display: formatDate(periodStart),
      period_end_display: formatDate(periodEnd),

      total_gross: gross,
      total_deductions: deductions,
      total_deduction: deductions,
      total_tax: tax,
      total_net: net,

      total_gross_display: formatRupiah(gross),
      total_deductions_display: formatRupiah(deductions),
      total_deduction_display: formatRupiah(deductions),
      total_tax_display: formatRupiah(tax),
      total_net_display: formatRupiah(net),

      status: statusText(pick(row, ["status"])),
      status_label: statusText(pick(row, ["status"])),
    };
  });
}

function normalizeKPIReviewRows(
  rows: ModuleRow[],
  employeeIndex: Record<string, ModuleRow>
) {
  return rows.map((row) => {
    const periodStart = pick(row, ["period_start", "start_date"]);
    const periodEnd = pick(row, ["period_end", "end_date"]);

    return {
      ...row,
      employee_name: getEmployeeName(row, employeeIndex),

      period_start: periodStart,
      period_end: periodEnd,
      period_start_display: formatDate(periodStart),
      period_end_display: formatDate(periodEnd),

      total_score: pick(row, ["total_score", "score"]) || "-",
      rating: pick(row, ["rating", "grade"]) || "-",
      status_label: statusText(pick(row, ["status"])),
    };
  });
}

function buildMetrics(moduleKey: HRModuleKey, rows: ModuleRow[]): ModuleMetric[] {
  return [
    {
      label: "Total Records",
      value: String(rows.length),
      helper: `Total data ${moduleKey}.`,
    },
    {
      label: "Synced",
      value: rows.length > 0 ? "Yes" : "No",
      helper: "Status sinkronisasi data backend.",
    },
  ];
}

function removeSortParams(params: Record<string, unknown>) {
  const clone = {
    ...params,
  };

  delete clone.sort_by;
  delete clone.sort_order;

  return clone;
}

function removeCompanyParams(params: Record<string, unknown>) {
  const clone = {
    ...params,
  };

  delete clone.company_id;

  return clone;
}

async function tryGetRows(
  endpoint: string,
  params: Record<string, unknown>
): Promise<ModuleRow[]> {
  try {
    const response = await api.get(endpoint, {
      params,
    });

    return normalizeRows(response.data);
  } catch {
    return [];
  }
}

async function safeGetFromCandidates(
  endpoints: string[],
  params: Record<string, unknown>
) {
  const paramCandidates: Record<string, unknown>[] = [
    params,
    removeSortParams(params),
    removeCompanyParams(params),
    removeSortParams(removeCompanyParams(params)),
    {
      limit: 100,
    },
    {},
  ];

  for (const endpoint of endpoints) {
    for (const paramCandidate of paramCandidates) {
      const rows = await tryGetRows(endpoint, paramCandidate);

      if (rows.length > 0) return rows;
    }
  }

  return [];
}

function resolveParams(input: GetHRModuleDataParams) {
  if (typeof input === "string") {
    return {
      moduleKey: input,
      companyId: undefined,
    };
  }

  return input;
}

export async function getHRModuleData(input: GetHRModuleDataParams) {
  const { moduleKey, companyId } = resolveParams(input);

  const params = getScopedQueryParams("hr", {
    ...(companyId ? { company_id: companyId } : {}),
    limit: 100,
    sort_by: sortMap[moduleKey],
    sort_order: "desc",
  });

  const [rawRows, employeeRows, leaveTypeRows] = await Promise.all([
    safeGetFromCandidates(endpointMap[moduleKey], params),
    safeGetFromCandidates(endpointMap.employees, {
      ...params,
      sort_by: "full_name",
    }),
    safeGetFromCandidates(endpointMap["leave-types"], {
      ...params,
      sort_by: "name",
    }),
  ]);

  const employeeIndex = buildIndex(employeeRows);
  const leaveTypeIndex = buildIndex(leaveTypeRows);

  let rows: ModuleRow[] = rawRows;

  if (moduleKey === "employees") {
    rows = normalizeEmployeeRows(rawRows);
  }

  if (moduleKey === "attendance") {
    rows = normalizeAttendanceRows(rawRows, employeeIndex);
  }

  if (moduleKey === "leave-types") {
    rows = normalizeLeaveTypeRows(rawRows);
  }

  if (moduleKey === "leave-requests") {
    rows = normalizeLeaveRequestRows(rawRows, employeeIndex, leaveTypeIndex);
  }

  if (moduleKey === "tasks") {
    rows = normalizeTaskRows(rawRows, employeeIndex);
  }

  if (moduleKey === "payroll-runs") {
    rows = normalizePayrollRows(rawRows);
  }

  if (moduleKey === "kpi-reviews") {
    rows = normalizeKPIReviewRows(rawRows, employeeIndex);
  }

  return {
    rows,
    metrics: buildMetrics(moduleKey, rows),
    aiNotes: [
      `Data HR ${moduleKey} berhasil dibaca.`,
      "Payroll memakai total_deductions sesuai kolom database.",
      "Field payroll dibuat ke total_gross_display, total_deductions_display, total_tax_display, dan total_net_display.",
    ],
  };
}