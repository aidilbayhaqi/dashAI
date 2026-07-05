import { api } from "@/lib/api";
import type { ModuleMetric, ModuleRow } from "@/types/modules";
import type { HRModuleKey } from "./types";

type GetHRModuleDataParams =
  | HRModuleKey
  | {
      moduleKey: HRModuleKey;
      companyId?: string;
    };

type ApiListResponse = {
  data?: ModuleRow[];
  items?: ModuleRow[];
  results?: ModuleRow[];
  rows?: ModuleRow[];
};

const endpointMap: Record<HRModuleKey, string> = {
  employees: "/api/v1/hr/employees",
  attendance: "/api/v1/hr/attendance",
  "leave-types": "/api/v1/hr/leave-types",
  "leave-requests": "/api/v1/hr/leave-requests",
  tasks: "/api/v1/hr/tasks",
  "payroll-runs": "/api/v1/hr/payroll-runs",
};

const sortMap: Record<HRModuleKey, string> = {
  employees: "full_name",
  attendance: "attendance_date",
  "leave-types": "code",
  "leave-requests": "start_date",
  tasks: "created_at",
  "payroll-runs": "period_start",
};

function normalizeRows(data: unknown): ModuleRow[] {
  if (Array.isArray(data)) return data as ModuleRow[];

  if (!data || typeof data !== "object") return [];

  const record = data as ApiListResponse;

  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.rows)) return record.rows;

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

function parseMoneyNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

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

    if (lastCommaIndex > lastDotIndex) {
      /**
       * Format Indonesia:
       * 5.000.000,00 -> 5000000.00
       */
      normalized = cleaned.replaceAll(".", "").replace(",", ".");
    } else {
      /**
       * Format backend / US:
       * 5,000,000.00 -> 5000000.00
       */
      normalized = cleaned.replaceAll(",", "");
    }
  } else if (hasDot) {
    const parts = cleaned.split(".");

    if (parts.length === 2 && parts[1].length <= 6) {
      /**
       * Format backend decimal:
       * 5000000.00 -> 5000000.00
       */
      normalized = cleaned;
    } else {
      /**
       * Format Indonesia ribuan:
       * 5.000.000 -> 5000000
       */
      normalized = cleaned.replaceAll(".", "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");

    if (parts.length === 2 && parts[1].length <= 2) {
      /**
       * Format decimal Indonesia:
       * 5000000,00 -> 5000000.00
       */
      normalized = cleaned.replace(",", ".");
    } else {
      /**
       * Format ribuan pakai comma:
       * 5,000,000 -> 5000000
       */
      normalized = cleaned.replaceAll(",", "");
    }
  }

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function formatRupiah(value: unknown) {
  const parsed = parseMoneyNumber(value);

  if (parsed === null) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function getEmployeeName(row: ModuleRow) {
  return (
    pick(row, [
      "employee_name",
      "full_name",
      "name",
      "employee_full_name",
      "employee",
    ]) || "-"
  );
}

function normalizeEmployeeRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const baseSalary = pick(row, ["base_salary", "salary", "basic_salary"]);

    return {
      ...row,
      employee_no: pick(row, ["employee_no", "code", "number"]),
      full_name: getEmployeeName(row),
      email: pick(row, ["email"]),
      phone: pick(row, ["phone"]),
      department_name: pick(row, ["department_name", "department"]),
      job_title: pick(row, ["job_title", "position", "role"]),
      employment_type: pick(row, ["employment_type", "type"]),
      base_salary: baseSalary,
      base_salary_display: formatRupiah(baseSalary),
      status: pick(row, ["status"]),
    };
  });
}

function normalizeAttendanceRows(rows: ModuleRow[]) {
  return rows.map((row) => ({
    ...row,
    employee_name: getEmployeeName(row),
    attendance_date: pick(row, ["attendance_date", "date"]),
    clock_in: pick(row, ["clock_in", "check_in", "time_in"]),
    clock_out: pick(row, ["clock_out", "check_out", "time_out"]),
    status: pick(row, ["status"]),
  }));
}

function normalizeLeaveTypeRows(rows: ModuleRow[]) {
  return rows.map((row) => ({
    ...row,
    code: pick(row, ["code"]),
    name: pick(row, ["name", "leave_type_name"]),
    max_days: pick(row, ["max_days", "quota_days", "days"]),
    is_paid: pick(row, ["is_paid", "paid"]),
    is_active: pick(row, ["is_active", "active"]),
  }));
}

function normalizeLeaveRequestRows(rows: ModuleRow[]) {
  return rows.map((row) => ({
    ...row,
    employee_name: getEmployeeName(row),
    leave_type_name: pick(row, [
      "leave_type_name",
      "leave_type",
      "type_name",
      "name",
    ]),
    start_date: pick(row, ["start_date"]),
    end_date: pick(row, ["end_date"]),
    total_days: pick(row, ["total_days", "days"]),
    status: pick(row, ["status"]),
  }));
}

function normalizeTaskRows(rows: ModuleRow[]) {
  return rows.map((row) => ({
    ...row,
    title: pick(row, ["title", "name", "task_name"]),
    employee_name: getEmployeeName(row),
    priority: pick(row, ["priority"]),
    status: pick(row, ["status"]),
    due_date: pick(row, ["due_date", "deadline"]),
  }));
}

function normalizePayrollRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const totalGross = pick(row, ["total_gross", "gross_amount", "gross"]);
    const totalDeduction = pick(row, [
      "total_deduction",
      "deduction_amount",
      "deduction",
    ]);
    const totalNet = pick(row, ["total_net", "net_amount", "net"]);

    return {
      ...row,
      period_start: pick(row, ["period_start", "start_date"]),
      period_end: pick(row, ["period_end", "end_date"]),
      payment_date: pick(row, ["payment_date", "paid_date"]),

      total_gross: totalGross,
      total_deduction: totalDeduction,
      total_net: totalNet,

      total_gross_display: formatRupiah(totalGross),
      total_deduction_display: formatRupiah(totalDeduction),
      total_net_display: formatRupiah(totalNet),

      status: pick(row, ["status"]),
    };
  });
}

function normalizeByModule(moduleKey: HRModuleKey, rows: ModuleRow[]) {
  if (moduleKey === "employees") return normalizeEmployeeRows(rows);
  if (moduleKey === "attendance") return normalizeAttendanceRows(rows);
  if (moduleKey === "leave-types") return normalizeLeaveTypeRows(rows);
  if (moduleKey === "leave-requests") return normalizeLeaveRequestRows(rows);
  if (moduleKey === "tasks") return normalizeTaskRows(rows);
  if (moduleKey === "payroll-runs") return normalizePayrollRows(rows);

  return rows;
}

function buildMetrics(moduleKey: HRModuleKey, rows: ModuleRow[]): ModuleMetric[] {
  const total = rows.length;

  const active = rows.filter((row) =>
    String(row.status ?? "").toLowerCase().includes("active")
  ).length;

  const needAttention = rows.filter((row) =>
    ["pending", "draft", "todo", "in_progress", "late", "review"].some(
      (status) => String(row.status ?? "").toLowerCase().includes(status)
    )
  ).length;

  return [
    {
      label: "Total Records",
      value: String(total),
      helper: `Total data ${moduleKey}.`,
    },
    {
      label: "Active",
      value: String(active),
      helper: "Record aktif dari data yang sedang tampil.",
    },
    {
      label: "Need Attention",
      value: String(needAttention),
      helper: "Pending, draft, todo, review, atau in progress.",
    },
  ];
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
  const endpoint = endpointMap[moduleKey];

  const response = await api.get(endpoint, {
    params: {
      ...(companyId
        ? {
            company_id: companyId,
          }
        : {}),
      limit: 100,
      sort_by: sortMap[moduleKey],
      sort_order: "asc",
    },
  });

  const rows = normalizeByModule(moduleKey, normalizeRows(response.data));

  return {
    rows,
    metrics: buildMetrics(moduleKey, rows),
    aiNotes: [
      `Data HR ${moduleKey} berhasil di-fetch dari backend.`,
      companyId
        ? "Data sedang difilter berdasarkan company."
        : "Superadmin dapat melihat semua company atau memilih company dari filter.",
    ],
  };
}