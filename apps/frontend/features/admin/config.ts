import { Building2, Settings, ShieldCheck } from "lucide-react";
import type { ModuleConfig } from "@/types/modules";
import type { AdminModuleKey } from "./types";

export const adminModuleConfig: Record<AdminModuleKey, ModuleConfig> = {
  companies: {
    badge: "Administration / Companies",
    title: "Companies",
    description:
      "Kelola perusahaan, tenant, branch, workspace, dan konfigurasi multi-company.",
    icon: Building2,
    columns: [
      { key: "company", label: "Company" },
      { key: "industry", label: "Industry" },
      { key: "branches", label: "Branches" },
      { key: "plan", label: "Plan" },
      { key: "status", label: "Status" },
    ],
  },

  users: {
    badge: "Administration / Access Control",
    title: "Users & Roles",
    description:
      "Kelola user, role, permission, akses modul, dan keamanan sistem.",
    icon: ShieldCheck,
    columns: [
      { key: "user", label: "User" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "lastLogin", label: "Last Login" },
      { key: "status", label: "Status" },
    ],
  },

  settings: {
    badge: "Administration / Settings",
    title: "Settings",
    description:
      "Kelola konfigurasi sistem, workspace, notification, branding, dan integrasi.",
    icon: Settings,
    columns: [
      { key: "setting", label: "Setting" },
      { key: "category", label: "Category" },
      { key: "value", label: "Value" },
      { key: "updated", label: "Updated" },
      { key: "status", label: "Status" },
    ],
  },
};