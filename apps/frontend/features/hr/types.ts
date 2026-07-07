export type HRModuleKey =
  | "employees"
  | "attendance"
  | "leave-types"
  | "leave-requests"
  | "tasks"
  | "payroll-runs"
  | "kpi-reviews";

export function normalizeHRModuleKey(value: string): HRModuleKey {
  const normalized = value.trim();

  const aliases: Record<string, HRModuleKey> = {
    employees: "employees",
    employee: "employees",
    overview: "employees",

    attendance: "attendance",

    "leave-types": "leave-types",
    leaveTypes: "leave-types",
    leave_types: "leave-types",
    leaveType: "leave-types",
    leave_type: "leave-types",

    "leave-requests": "leave-requests",
    leaveRequests: "leave-requests",
    leave_requests: "leave-requests",
    leave: "leave-requests",
    "leave-management": "leave-requests",

    tasks: "tasks",
    task: "tasks",

    payroll: "payroll-runs",
    payrollRuns: "payroll-runs",
    payroll_runs: "payroll-runs",
    "payroll-runs": "payroll-runs",

    kpi: "kpi-reviews",
    kpiReviews: "kpi-reviews",
    kpi_reviews: "kpi-reviews",
    "kpi-reviews": "kpi-reviews",
  };

  return aliases[normalized] ?? "employees";
}