import {
  BadgeDollarSign,
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  UserCheck,
  Users,
} from "lucide-react";
import type { ModuleConfig } from "@/types/modules";
import type { HRModuleKey } from "./types";

export const hrModuleConfig: Record<HRModuleKey, ModuleConfig> = {
  overview: {
    badge: "Human Capital",
    title: "Human Resource",
    description:
      "Kelola employee, attendance, leave request, KPI, performance review, dan payroll.",
    icon: Users,
    columns: [
      { key: "employee", label: "Employee" },
      { key: "division", label: "Division" },
      { key: "role", label: "Role" },
      { key: "kpi", label: "KPI" },
      { key: "status", label: "Status" },
    ],
  },

  employees: {
    badge: "Human Capital / Employees",
    title: "Employees",
    description: "Kelola data karyawan, jabatan, divisi, status, dan performa.",
    icon: UserCheck,
    columns: [
      { key: "name", label: "Name" },
      { key: "division", label: "Division" },
      { key: "position", label: "Position" },
      { key: "joined", label: "Joined" },
      { key: "status", label: "Status" },
    ],
  },

  attendance: {
    badge: "Human Capital / Attendance",
    title: "Attendance",
    description:
      "Monitor kehadiran, keterlambatan, overtime, dan pola absensi karyawan.",
    icon: CalendarCheck,
    columns: [
      { key: "employee", label: "Employee" },
      { key: "checkIn", label: "Check In" },
      { key: "checkOut", label: "Check Out" },
      { key: "hours", label: "Hours" },
      { key: "status", label: "Status" },
    ],
  },

  leave: {
    badge: "Human Capital / Leave",
    title: "Leave Management",
    description:
      "Kelola pengajuan cuti, approval, balance cuti, dan kalender absensi.",
    icon: ClipboardCheck,
    columns: [
      { key: "employee", label: "Employee" },
      { key: "type", label: "Type" },
      { key: "date", label: "Date" },
      { key: "duration", label: "Duration" },
      { key: "status", label: "Status" },
    ],
  },

  kpi: {
    badge: "Human Capital / KPI",
    title: "KPI",
    description:
      "Pantau target, actual, performance score, dan evaluasi karyawan.",
    icon: BarChart3,
    columns: [
      { key: "employee", label: "Employee" },
      { key: "target", label: "Target" },
      { key: "actual", label: "Actual" },
      { key: "score", label: "Score" },
      { key: "status", label: "Status" },
    ],
  },

  payroll: {
    badge: "Human Capital / Payroll",
    title: "Payroll",
    description:
      "Kelola salary, allowance, deduction, tax, dan approval payroll.",
    icon: BadgeDollarSign,
    columns: [
      { key: "employee", label: "Employee" },
      { key: "salary", label: "Salary" },
      { key: "allowance", label: "Allowance" },
      { key: "deduction", label: "Deduction" },
      { key: "status", label: "Status" },
    ],
  },
};