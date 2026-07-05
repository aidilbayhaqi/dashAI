export type HRModuleKey =
  | "employees"
  | "attendance"
  | "leave-types"
  | "leave-requests"
  | "tasks"
  | "payroll-runs";

export function normalizeHRModuleKey(value: string): HRModuleKey {
  const normalized = value.trim();

  const aliases: Record<string, HRModuleKey> = {
    employees: "employees",
    employee: "employees",

    attendance: "attendance",

    "leave-types": "leave-types",
    leaveTypes: "leave-types",
    leave_types: "leave-types",

    "leave-requests": "leave-requests",
    leaveRequests: "leave-requests",
    leave_requests: "leave-requests",

    tasks: "tasks",
    task: "tasks",

    payroll: "payroll-runs",
    payrollRuns: "payroll-runs",
    payroll_runs: "payroll-runs",
    "payroll-runs": "payroll-runs",
  };

  return aliases[normalized] ?? "employees";
}