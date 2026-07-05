import type { ModuleData } from "@/types/modules";
import type { HRModuleKey } from "./types";

export const hrDummyData: Record<HRModuleKey, ModuleData> = {
  employees: {
    metrics: [
      {
        label: "Employees",
        value: "0",
        helper: "Total data karyawan.",
      },
      {
        label: "Active Employees",
        value: "0",
        helper: "Karyawan dengan status aktif.",
      },
      {
        label: "Need Review",
        value: "0",
        helper: "Data karyawan yang perlu dicek.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data employees.",
      "Tambahkan data karyawan untuk mulai mengelola HR.",
    ],
  },

  attendance: {
    metrics: [
      {
        label: "Attendance Records",
        value: "0",
        helper: "Total data absensi.",
      },
      {
        label: "Present",
        value: "0",
        helper: "Karyawan yang hadir.",
      },
      {
        label: "Late / Absent",
        value: "0",
        helper: "Absensi yang perlu diperhatikan.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data attendance.",
      "Tambahkan data absensi untuk mulai monitoring kehadiran.",
    ],
  },

  "leave-types": {
    metrics: [
      {
        label: "Leave Types",
        value: "0",
        helper: "Total jenis cuti.",
      },
      {
        label: "Paid Leave",
        value: "0",
        helper: "Jenis cuti berbayar.",
      },
      {
        label: "Active Types",
        value: "0",
        helper: "Jenis cuti yang aktif.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data leave types.",
      "Tambahkan tipe cuti seperti annual leave, sick leave, atau unpaid leave.",
    ],
  },

  "leave-requests": {
    metrics: [
      {
        label: "Leave Requests",
        value: "0",
        helper: "Total pengajuan cuti.",
      },
      {
        label: "Pending",
        value: "0",
        helper: "Pengajuan cuti yang menunggu approval.",
      },
      {
        label: "Approved",
        value: "0",
        helper: "Pengajuan cuti yang sudah disetujui.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data leave requests.",
      "Pengajuan cuti karyawan akan muncul di sini.",
    ],
  },

  tasks: {
    metrics: [
      {
        label: "Tasks",
        value: "0",
        helper: "Total task HR.",
      },
      {
        label: "In Progress",
        value: "0",
        helper: "Task yang sedang dikerjakan.",
      },
      {
        label: "Done",
        value: "0",
        helper: "Task yang sudah selesai.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data tasks.",
      "Tambahkan task untuk employee assignment atau pekerjaan HR.",
    ],
  },

  "payroll-runs": {
    metrics: [
      {
        label: "Payroll Runs",
        value: "0",
        helper: "Total proses payroll.",
      },
      {
        label: "Draft",
        value: "0",
        helper: "Payroll yang masih draft.",
      },
      {
        label: "Paid",
        value: "0",
        helper: "Payroll yang sudah dibayarkan.",
      },
    ],
    rows: [],
    aiNotes: [
      "Belum ada data payroll.",
      "Payroll run berdasarkan periode akan muncul di sini.",
    ],
  },
};