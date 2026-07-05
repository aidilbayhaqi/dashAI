import {
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
    placeholder: "+62-812-xxxx",
  },
  {
    key: "photo_url",
    label: "Employee Photo",
    type: "file",
  },
  {
    key: "department_name",
    label: "Department",
    placeholder: "IT / Finance / HR / Sales",
  },
  {
    key: "job_title",
    label: "Job Title",
    placeholder: "Software Developer",
  },
  {
    key: "employment_type",
    label: "Employment Type",
    type: "select",
    options: [
      { label: "Full Time", value: "full_time" },
      { label: "Part Time", value: "part_time" },
      { label: "Contract", value: "contract" },
      { label: "Internship", value: "internship" },
      { label: "Freelance", value: "freelance" },
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
  },
  {
    key: "attendance_date",
    label: "Attendance Date",
    type: "date",
    required: true,
  },
  {
    key: "clock_in",
    label: "Clock In",
    type: "datetime-local",
  },
  {
    key: "clock_out",
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
    key: "max_days",
    label: "Max Days",
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
  },
  {
    key: "leave_type_id",
    label: "Leave Type",
    type: "select",
    required: true,
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
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
];

const taskFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "employee_id",
    label: "Assigned Employee",
    type: "select",
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
    key: "payment_date",
    label: "Payment Date",
    type: "date",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Calculated", value: "calculated" },
      { label: "Paid", value: "paid" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

export const hrModuleConfig: Record<HRModuleKey, ModuleConfig> = {
  employees: {
    badge: "HR / Employees",
    title: "Employees",
    description:
      "Kelola data karyawan, cabang, jabatan, status kerja, tanggal masuk, dan gaji pokok.",
    icon: UsersRound,
    tableTitle: "Employee Records",
    tableDescription:
      "Data karyawan berdasarkan company, branch, department, dan status kerja.",
    columns: [
      { key: "photo_url", label: "Photo" },
      { key: "employee_no", label: "Employee No" },
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "department_name", label: "Department" },
      { key: "job_title", label: "Job Title" },
      { key: "employment_type", label: "Type" },
      { key: "base_salary_display", label: "Base Salary" },
      { key: "status", label: "Status" },
    ],
    formFields: employeeFormFields,
  },

  attendance: {
    badge: "HR / Attendance",
    title: "Attendance",
    description:
      "Monitoring absensi karyawan, jam masuk, jam keluar, status hadir, dan catatan.",
    icon: CalendarCheck,
    tableTitle: "Attendance Records",
    tableDescription: "Riwayat absensi karyawan berdasarkan tanggal.",
    columns: [
      { key: "attendance_date", label: "Date" },
      { key: "employee_name", label: "Employee" },
      { key: "clock_in", label: "Clock In" },
      { key: "clock_out", label: "Clock Out" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Notes" },
    ],
    formFields: attendanceFormFields,
  },

  "leave-types": {
    badge: "HR / Leave Types",
    title: "Leave Types",
    description:
      "Kelola jenis cuti seperti annual leave, sick leave, dan unpaid leave.",
    icon: FileClock,
    tableTitle: "Leave Type Records",
    tableDescription: "Daftar tipe cuti perusahaan.",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "max_days", label: "Max Days" },
      { key: "is_paid", label: "Paid" },
      { key: "is_active", label: "Active" },
    ],
    formFields: leaveTypeFormFields,
  },

  "leave-requests": {
    badge: "HR / Leave Requests",
    title: "Leave Requests",
    description:
      "Kelola pengajuan cuti karyawan berdasarkan tipe cuti, tanggal, alasan, dan status approval.",
    icon: BriefcaseBusiness,
    tableTitle: "Leave Request Records",
    tableDescription: "Data pengajuan cuti dan approval status.",
    columns: [
      { key: "employee_name", label: "Employee" },
      { key: "leave_type_name", label: "Leave Type" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "total_days", label: "Days" },
      { key: "status", label: "Status" },
    ],
    formFields: leaveRequestFormFields,
  },

  tasks: {
    badge: "HR / Tasks",
    title: "Tasks",
    description:
      "Kelola tugas karyawan, prioritas, deadline, status progress, dan assignment.",
    icon: ClipboardList,
    tableTitle: "HR Task Records",
    tableDescription: "Daftar task operasional HR dan employee assignment.",
    columns: [
      { key: "title", label: "Title" },
      { key: "employee_name", label: "Employee" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "due_date", label: "Due Date" },
    ],
    formFields: taskFormFields,
  },

  "payroll-runs": {
    badge: "HR / Payroll",
    title: "Payroll",
    description:
      "Kelola payroll run berdasarkan periode, status perhitungan, dan tanggal pembayaran.",
    icon: HandCoins,
    tableTitle: "Payroll Runs",
    tableDescription: "Data proses payroll perusahaan berdasarkan periode.",
    columns: [
      { key: "period_start", label: "Period Start" },
      { key: "period_end", label: "Period End" },
      { key: "payment_date", label: "Payment Date" },
      { key: "total_gross_display", label: "Gross" },
      { key: "total_deduction_display", label: "Deduction" },
      { key: "total_net_display", label: "Net" },
      { key: "status", label: "Status" },
    ],
    formFields: payrollFormFields,
  },
};