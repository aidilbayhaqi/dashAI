import type { ModuleData } from "@/types/modules";
import type { AdminModuleKey } from "./types";

export const adminDummyData: Record<AdminModuleKey, ModuleData> = {
  companies: {
    metrics: [
      { label: "Companies", value: "4", helper: "Workspace aktif" },
      { label: "Branches", value: "12", helper: "Cabang terdaftar" },
      { label: "Active Plan", value: "Pro", helper: "Subscription berjalan" },
    ],
    rows: [
      {
        company: "Main Company",
        industry: "Technology",
        branches: "4",
        plan: "Pro",
        status: "Active",
      },
      {
        company: "Retail Subsidiary",
        industry: "Retail",
        branches: "6",
        plan: "Business",
        status: "Active",
      },
      {
        company: "Ops Partner",
        industry: "Service",
        branches: "2",
        plan: "Starter",
        status: "Review",
      },
    ],
    aiNotes: [
      "Multi-company perlu dipisahkan berdasarkan tenant dan permission.",
      "Setiap perusahaan bisa punya konfigurasi modul yang berbeda.",
      "Company context wajib dikirim di setiap request API.",
    ],
  },

  users: {
    metrics: [
      { label: "Users", value: "64", helper: "User aktif" },
      { label: "Roles", value: "8", helper: "Role terdaftar" },
      { label: "Pending Invite", value: "5", helper: "Invite belum diterima" },
    ],
    rows: [
      {
        user: "Super Admin",
        email: "superadmin@dashai.test",
        role: "Super Admin",
        lastLogin: "Today",
        status: "Active",
      },
      {
        user: "Finance Admin",
        email: "finance@dashai.test",
        role: "Finance",
        lastLogin: "Yesterday",
        status: "Active",
      },
      {
        user: "HR Manager",
        email: "hr@dashai.test",
        role: "HR",
        lastLogin: "3 days ago",
        status: "Review",
      },
    ],
    aiNotes: [
      "Permission harus granular per modul dan action.",
      "Audit log penting untuk aktivitas finance dan user management.",
      "Role-based access control perlu diterapkan dari backend dan frontend.",
    ],
  },

  settings: {
    metrics: [
      { label: "Integrations", value: "6", helper: "Connected service" },
      { label: "Notifications", value: "Active", helper: "System alert enabled" },
      { label: "Security", value: "Good", helper: "Basic security active" },
    ],
    rows: [
      {
        setting: "Company Branding",
        category: "Workspace",
        value: "DashAI",
        updated: "Today",
        status: "Active",
      },
      {
        setting: "Email Notification",
        category: "Notification",
        value: "Enabled",
        updated: "Yesterday",
        status: "Active",
      },
      {
        setting: "AI Reporting",
        category: "Intelligence",
        value: "Beta",
        updated: "Today",
        status: "Review",
      },
    ],
    aiNotes: [
      "Settings nanti perlu dibagi antara global config dan tenant config.",
      "AI Reporting sebaiknya bisa diaktifkan per company/module.",
      "Integrasi eksternal seperti email, payment, dan WhatsApp bisa masuk di sini.",
    ],
  },
};