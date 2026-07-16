import {
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardList,
  FileClock,
  HandCoins,
  UsersRound,
} from "lucide-react";

import type { ModuleConfig, ModuleField } from "@/types/modules";
import type { HRModuleKey } from "./types";

const companyBranchFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  {
    key: "branch_id",
    label: "Branch",
    type: "select",
  },
];

const employeeFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "employee_no",
    label: "Employee No",
    placeholder: "EMP-2026-0001",
    required: true,
  },
  {
    key: "full_name",
    label: "Full Name",
    placeholder: "Nama karyawan",
    required: true,
  },
  {
    key: "email",
    label: "Email",
    type: "email",
  },
  {
    key: "phone",
    label: "Phone",
  },
  {
    key: "photo_url",
    label: "Photo",
    type: "file",
  },
  {
    key: "department_name",
    label: "Department",
  },
  {
    key: "job_title",
    label: "Job Title",
  },
  {
    key: "employment_type",
    label: "Employment Type",
    type: "select",
    options: [
      { label: "Full Time", value: "full_time" },
      { label: "Part Time", value: "part_time" },
      { label: "Contract", value: "contract" },
      { label: "Intern", value: "intern" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Resigned", value: "resigned" },
      { label: "Terminated", value: "terminated" },
    ],
  },
  {
    key: "hire_date",
    label: "Hire Date",
    type: "date",
  },
  {
    key: "resign_date",
    label: "Resign Date",
    type: "date",
  },
  {
    key: "base_salary",
    label: "Base Salary",
    type: "number",
  },
];

const attendanceFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "employee_id",
    label: "Employee",
    type: "select",
    required: true,
    placeholder: "Cari / pilih karyawan",
  },
  {
    key: "attendance_date",
    label: "Attendance Date",
    type: "date",
    required: true,
  },
  {
    key: "check_in_at",
    label: "Clock In",
    type: "datetime-local",
  },
  {
    key: "check_out_at",
    label: "Clock Out",
    type: "datetime-local",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Present", value: "present" },
      { label: "Late", value: "late" },
      { label: "Absent", value: "absent" },
      { label: "Leave", value: "leave" },
      { label: "Sick", value: "sick" },
    ],
  },
  {
    key: "work_minutes",
    label: "Work Minutes",
    type: "number",
  },
  {
    key: "overtime_minutes",
    label: "Overtime Minutes",
    type: "number",
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

const leaveTypeFormFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  {
    key: "code",
    label: "Code",
    placeholder: "ANNUAL",
    required: true,
  },
  {
    key: "name",
    label: "Leave Type Name",
    placeholder: "Annual Leave",
    required: true,
  },
  {
    key: "default_days_per_year",
    label: "Default Days Per Year",
    type: "number",
  },
  {
    key: "is_paid",
    label: "Paid Leave",
    type: "select",
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  {
    key: "is_active",
    label: "Active",
    type: "select",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

const leaveRequestFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "employee_id",
    label: "Employee",
    type: "select",
    required: true,
    placeholder: "Cari / pilih karyawan",
  },
  {
    key: "leave_type_id",
    label: "Leave Type",
    type: "select",
    required: true,
    placeholder: "Cari / pilih leave type",
  },
  {
    key: "start_date",
    label: "Start Date",
    type: "date",
    required: true,
  },
  {
    key: "end_date",
    label: "End Date",
    type: "date",
    required: true,
  },
  {
    key: "total_days",
    label: "Total Days",
    type: "number",
  },
  {
    key: "reason",
    label: "Reason",
    type: "textarea",
  },
];

const taskFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "employee_id",
    label: "Assigned Employee",
    type: "select",
    placeholder: "Cari / pilih karyawan",
  },
  {
    key: "title",
    label: "Task Title",
    required: true,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
      { label: "Critical", value: "critical" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Todo", value: "todo" },
      { label: "In Progress", value: "in_progress" },
      { label: "Review", value: "review" },
      { label: "Done", value: "done" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  {
    key: "due_date",
    label: "Due Date",
    type: "date",
  },
];

const payrollFormFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  {
    key: "branch_id",
    label: "Branch",
    type: "select",
  },
  {
    key: "payroll_no",
    label: "Payroll No",
    placeholder: "PAY-2026-0001",
    required: true,
  },
  {
    key: "period_start",
    label: "Period Start",
    type: "date",
    required: true,
  },
  {
    key: "period_end",
    label: "Period End",
    type: "date",
    required: true,
  },
];

const kpiReviewFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "employee_id",
    label: "Employee",
    type: "select",
    required: true,
    placeholder: "Cari / pilih karyawan",
  },
  {
    key: "period_start",
    label: "Period Start",
    type: "date",
    required: true,
  },
  {
    key: "period_end",
    label: "Period End",
    type: "date",
    required: true,
  },
  {
    key: "total_score",
    label: "Total Score",
    type: "number",
  },
  {
    key: "rating",
    label: "Rating",
    placeholder: "A / B / C / Excellent",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Review", value: "review" },
      { label: "Completed", value: "completed" },
    ],
  },
];

export const hrModuleConfig: Record<HRModuleKey, ModuleConfig> = {
  employees: {
    badge: "HR / Employees",
    title: "Employees",
    description: "Kelola data karyawan, jabatan, status kerja, dan salary.",
    icon: UsersRound,
    tableTitle: "Employee Records",
    tableDescription: "Data karyawan perusahaan.",
    columns: [
      { key: "photo_url", label: "Photo" },
      { key: "employee_no", label: "Employee No" },
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "department_name", label: "Department" },
      { key: "job_title", label: "Job Title" },
      { key: "employment_type_label", label: "Type" },
      { key: "base_salary_display", label: "Base Salary", format: "currency" },
      { key: "status_label", label: "Status" },
    ],
    formFields: employeeFormFields,
  },

  attendance: {
    badge: "HR / Attendance",
    title: "Attendance",
    description: "Monitoring absensi karyawan.",
    icon: CalendarCheck,
    tableTitle: "Attendance Records",
    tableDescription: "Data jam masuk dan jam keluar karyawan.",
    columns: [
      { key: "employee_name", label: "Employee" },
      { key: "attendance_date_display", label: "Date" },
      { key: "check_in_display", label: "Clock In" },
      { key: "check_out_display", label: "Clock Out" },
      { key: "work_minutes", label: "Work Minutes", format: "number", unit: "menit" },
      { key: "overtime_minutes", label: "Overtime", format: "number", unit: "menit" },
      { key: "status_label", label: "Status" },
    ],
    formFields: attendanceFormFields,
  },

  "leave-types": {
    badge: "HR / Leave Types",
    title: "Leave Types",
    description: "Kelola master tipe cuti.",
    icon: FileClock,
    tableTitle: "Leave Type Records",
    tableDescription: "Master data tipe cuti perusahaan.",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "default_days_per_year", label: "Default Days", format: "decimal", maximumFractionDigits: 2, unit: "hari" },
      { key: "is_paid_label", label: "Paid" },
      { key: "is_active_label", label: "Active" },
    ],
    formFields: leaveTypeFormFields,
  },

  "leave-requests": {
    badge: "HR / Leave Management",
    title: "Leave Management",
    description: "Kelola pengajuan cuti karyawan.",
    icon: ClipboardList,
    tableTitle: "Leave Request Records",
    tableDescription: "Data pengajuan cuti karyawan.",
    columns: [
      { key: "employee_name", label: "Employee" },
      { key: "leave_type_name", label: "Leave Type" },
      { key: "start_date_display", label: "Start Date" },
      { key: "end_date_display", label: "End Date" },
      { key: "total_days", label: "Days", format: "decimal", maximumFractionDigits: 2, unit: "hari" },
      { key: "status_label", label: "Status" },
    ],
    formFields: leaveRequestFormFields,
  },

  tasks: {
    badge: "HR / Tasks",
    title: "Tasks",
    description: "Kelola task HR dan assignment karyawan.",
    icon: BriefcaseBusiness,
    tableTitle: "Task Records",
    tableDescription: "Data task karyawan.",
    columns: [
      { key: "employee_name", label: "Employee" },
      { key: "title", label: "Task" },
      { key: "priority_label", label: "Priority" },
      { key: "due_date_display", label: "Due Date" },
      { key: "status_label", label: "Status" },
    ],
    formFields: taskFormFields,
  },

  "payroll-runs": {
    badge: "HR / Payroll",
    title: "Payroll Runs",
    description:
      "Kelola payroll run berdasarkan periode, gross, deduction, tax, dan net.",
    icon: HandCoins,
    tableTitle: "Payroll Records",
    tableDescription: "Data payroll run.",
    columns: [
  {
    key: "payroll_no",
    label: "Payroll No",
  },
  {
    key: "period_start_display",
    label: "Period Start",
  },
  {
    key: "period_end_display",
    label: "Period End",
  },
  {
    key: "total_gross_display",
    label: "Gross",
    format: "currency",
  },
  {
    key: "total_deductions_display",
    label: "Deduction",
    format: "currency",
  },
  {
    key: "total_tax_display",
    label: "Tax",
    format: "currency",
  },
  {
    key: "total_net_display",
    label: "Net",
    format: "currency",
  },
  {
    key: "status_label",
    label: "Status",
  },
],
    formFields: payrollFormFields,
  },

  "kpi-reviews": {
    badge: "HR / KPI",
    title: "KPI Reviews",
    description: "Kelola review KPI karyawan.",
    icon: BarChart3,
    tableTitle: "KPI Review Records",
    tableDescription: "Data KPI review per periode.",
    columns: [
      { key: "employee_name", label: "Employee" },
      { key: "period_start_display", label: "Period Start" },
      { key: "period_end_display", label: "Period End" },
      { key: "total_score", label: "Score", format: "decimal", maximumFractionDigits: 4 },
      { key: "rating", label: "Rating", format: "rating" },
      { key: "status_label", label: "Status" },
    ],
    formFields: kpiReviewFormFields,
  },
};