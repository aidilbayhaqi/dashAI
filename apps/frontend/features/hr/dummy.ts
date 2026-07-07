import type { ModuleData } from "@/types/modules";
import type { HRModuleKey } from "./types";

function emptyModuleData({
  label,
  helper,
  endpoint,
}: {
  label: string;
  helper: string;
  endpoint: string;
}): ModuleData {
  return {
    metrics: [
      {
        label,
        value: "0",
        helper,
        trend: "Empty",
      },
    ],
    rows: [],
    aiNotes: [
      `Data akan dibaca dari API ${endpoint}.`,
      "Dummy data ini hanya fallback agar UI tetap aman saat API belum tersedia.",
    ],
  };
}

export const hrDummyData: Record<HRModuleKey, ModuleData> = {
  employees: emptyModuleData({
    label: "Total Employees",
    helper: "Belum ada employee yang tercatat.",
    endpoint: "/api/v1/hr/employees",
  }),

  attendance: emptyModuleData({
    label: "Total Attendance",
    helper: "Belum ada attendance record yang tercatat.",
    endpoint: "/api/v1/hr/attendance",
  }),

  "leave-types": emptyModuleData({
    label: "Total Leave Types",
    helper: "Belum ada leave type yang tercatat.",
    endpoint: "/api/v1/hr/leave-types",
  }),

  "leave-requests": emptyModuleData({
    label: "Total Leave Requests",
    helper: "Belum ada leave request yang tercatat.",
    endpoint: "/api/v1/hr/leave-requests",
  }),

  tasks: emptyModuleData({
    label: "Total Tasks",
    helper: "Belum ada task HR yang tercatat.",
    endpoint: "/api/v1/hr/tasks",
  }),

  "payroll-runs": emptyModuleData({
    label: "Total Payroll Runs",
    helper: "Belum ada payroll run yang tercatat.",
    endpoint: "/api/v1/hr/payroll-runs",
  }),

  "kpi-reviews": emptyModuleData({
    label: "Total KPI Reviews",
    helper: "Belum ada KPI review yang tercatat.",
    endpoint: "/api/v1/hr/kpi-reviews",
  }),
};