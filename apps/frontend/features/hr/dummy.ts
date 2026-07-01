import type { ModuleData } from "@/types/modules";
import type { HRModuleKey } from "./types";

export const hrDummyData: Record<HRModuleKey, ModuleData> = {
  overview: {
    metrics: [
      { label: "Employees", value: "48", helper: "6 divisi aktif" },
      {
        label: "Attendance Rate",
        value: "96%",
        helper: "Rata-rata bulan ini",
        trend: "+2.1%",
      },
      { label: "Leave Request", value: "7", helper: "Menunggu approval HR" },
    ],
    rows: [
      {
        employee: "Andi Saputra",
        division: "Sales",
        role: "Sales Lead",
        kpi: "92%",
        status: "Active",
      },
      {
        employee: "Nadia Putri",
        division: "Finance",
        role: "Accountant",
        kpi: "88%",
        status: "Active",
      },
      {
        employee: "Riko Pratama",
        division: "Ops",
        role: "Warehouse",
        kpi: "74%",
        status: "Review",
      },
    ],
    aiNotes: [
      "KPI Ops perlu perhatian karena berada di bawah rata-rata perusahaan.",
      "Attendance rate stabil dan berdampak positif ke productivity score.",
      "Payroll bisa dikaitkan dengan attendance dan leave.",
    ],
  },

  employees: {
    metrics: [
      { label: "Total Employees", value: "48", helper: "Karyawan aktif" },
      { label: "New Hire", value: "4", helper: "Bulan ini" },
      { label: "Probation", value: "3", helper: "Dalam evaluasi" },
    ],
    rows: [
      {
        name: "Andi Saputra",
        division: "Sales",
        position: "Sales Lead",
        joined: "Jan 2024",
        status: "Active",
      },
      {
        name: "Nadia Putri",
        division: "Finance",
        position: "Accountant",
        joined: "Mar 2024",
        status: "Active",
      },
      {
        name: "Riko Pratama",
        division: "Ops",
        position: "Warehouse Staff",
        joined: "May 2026",
        status: "Probation",
      },
    ],
    aiNotes: [
      "Karyawan probation perlu performance review berkala.",
      "Data employee nantinya terhubung ke attendance, payroll, dan KPI.",
      "Role permission bisa diturunkan dari divisi dan jabatan.",
    ],
  },

  attendance: {
    metrics: [
      { label: "Attendance", value: "96%", helper: "Rata-rata bulan ini" },
      { label: "Late Check-in", value: "12", helper: "Kejadian minggu ini" },
      { label: "Overtime", value: "84h", helper: "Total overtime" },
    ],
    rows: [
      {
        employee: "Andi Saputra",
        checkIn: "08:02",
        checkOut: "17:08",
        hours: "9h 6m",
        status: "Active",
      },
      {
        employee: "Nadia Putri",
        checkIn: "08:14",
        checkOut: "17:00",
        hours: "8h 46m",
        status: "Late",
      },
      {
        employee: "Riko Pratama",
        checkIn: "07:58",
        checkOut: "18:10",
        hours: "10h 12m",
        status: "Overtime",
      },
    ],
    aiNotes: [
      "Late check-in meningkat pada divisi Finance minggu ini.",
      "Overtime Ops perlu dicek apakah karena shortage staff atau workload naik.",
      "Attendance bisa memengaruhi payroll otomatis.",
    ],
  },

  leave: {
    metrics: [
      { label: "Leave Request", value: "7", helper: "Menunggu approval" },
      { label: "Approved", value: "18", helper: "Bulan berjalan" },
      { label: "Rejected", value: "2", helper: "Bulan berjalan" },
    ],
    rows: [
      {
        employee: "Andi Saputra",
        type: "Annual Leave",
        date: "08 Jul 2026",
        duration: "2 days",
        status: "Pending",
      },
      {
        employee: "Nadia Putri",
        type: "Sick Leave",
        date: "01 Jul 2026",
        duration: "1 day",
        status: "Approved",
      },
      {
        employee: "Riko Pratama",
        type: "Annual Leave",
        date: "12 Jul 2026",
        duration: "3 days",
        status: "Review",
      },
    ],
    aiNotes: [
      "Approval cuti sebaiknya memperhatikan kalender operasional dan beban kerja tim.",
      "Data leave bisa dipakai untuk forecast kapasitas kerja mingguan.",
      "Cuti yang overlap dengan peak operation harus diberi alert.",
    ],
  },

  kpi: {
    metrics: [
      { label: "Avg KPI", value: "86%", helper: "Rata-rata perusahaan" },
      { label: "Top Division", value: "Finance", helper: "Score tertinggi" },
      { label: "Need Review", value: "5", helper: "KPI di bawah target" },
    ],
    rows: [
      {
        employee: "Andi Saputra",
        target: "100",
        actual: "92",
        score: "92%",
        status: "Active",
      },
      {
        employee: "Nadia Putri",
        target: "100",
        actual: "88",
        score: "88%",
        status: "Active",
      },
      {
        employee: "Riko Pratama",
        target: "100",
        actual: "74",
        score: "74%",
        status: "Review",
      },
    ],
    aiNotes: [
      "AI bisa memberikan rekomendasi coaching untuk karyawan dengan KPI rendah.",
      "KPI Sales kuat, namun Ops butuh analisis root cause.",
      "KPI bisa dipakai untuk bonus dan evaluasi payroll.",
    ],
  },

  payroll: {
    metrics: [
      { label: "Payroll Batch", value: "Rp 284 M", helper: "Estimasi bulan ini" },
      { label: "Pending Approval", value: "1", helper: "Batch menunggu approval" },
      { label: "Employees Paid", value: "44/48", helper: "Progress payroll" },
    ],
    rows: [
      {
        employee: "Andi Saputra",
        salary: "Rp 12.000.000",
        allowance: "Rp 1.200.000",
        deduction: "Rp 400.000",
        status: "Ready",
      },
      {
        employee: "Nadia Putri",
        salary: "Rp 10.500.000",
        allowance: "Rp 900.000",
        deduction: "Rp 350.000",
        status: "Ready",
      },
      {
        employee: "Riko Pratama",
        salary: "Rp 6.500.000",
        allowance: "Rp 500.000",
        deduction: "Rp 120.000",
        status: "Review",
      },
    ],
    aiNotes: [
      "Payroll bisa dihubungkan dengan attendance dan leave untuk perhitungan otomatis.",
      "Batch payroll menunggu approval final sebelum disubmit.",
      "Tax payroll bisa diteruskan ke modul Finance Taxes.",
    ],
  },
};