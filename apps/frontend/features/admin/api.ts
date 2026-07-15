import { api } from "@/lib/api";
import type { ModuleData, ModuleRow } from "@/types/modules";
import type { AdminModuleKey } from "./types";

type ListEnvelope =
  | unknown[]
  | { data?: unknown[]; items?: unknown[]; rows?: unknown[]; results?: unknown[] };

function rowsFrom(value: ListEnvelope | unknown): ModuleRow[] {
  if (Array.isArray(value)) return value as ModuleRow[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of ["data", "items", "rows", "results"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as ModuleRow[];
    if (candidate && typeof candidate === "object") {
      const nested = rowsFrom(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

function text(row: ModuleRow, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return fallback;
}

function statusText(row: ModuleRow) {
  if (typeof row.is_active === "boolean") return row.is_active ? "Active" : "Inactive";
  return text(row, ["status", "status_label"], "Active");
}

async function getCompaniesData(): Promise<ModuleData> {
  const response = await api.get("/api/v1/companies", {
    params: { page: 1, limit: 200, sort_by: "updated_at", sort_order: "desc" },
  });
  const sourceRows = rowsFrom(response.data);
  const rows = sourceRows.map((row) => ({
    id: row.id,
    company: text(row, ["name", "legal_name", "company_name"]),
    industry: text(row, ["industry", "business_type"]),
    branches: Number(row.branch_count ?? row.branches_count ?? 0),
    plan: text(row, ["plan", "subscription_plan"], "Internal"),
    status: statusText(row),
    updated_at: row.updated_at,
  }));
  const active = rows.filter((row) => String(row.status).toLowerCase() === "active").length;
  const branches = rows.reduce((total, row) => total + Number(row.branches || 0), 0);

  return {
    metrics: [
      { label: "Companies", value: String(rows.length), helper: "Workspace terdaftar" },
      { label: "Active", value: String(active), helper: "Company aktif" },
      { label: "Branches", value: String(branches), helper: "Cabang terindeks" },
    ],
    rows,
    aiNotes: [],
  };
}

async function getUsersData(): Promise<ModuleData> {
  const response = await api.get("/api/v1/users", {
    params: { page: 1, limit: 200, sort_by: "updated_at", sort_order: "desc" },
  });
  const sourceRows = rowsFrom(response.data);
  const rows = sourceRows.map((row) => ({
    id: row.id,
    user: text(row, ["full_name", "name"]),
    email: text(row, ["email"]),
    role: text(row, ["role_name", "role", "role_label"]),
    lastLogin: text(row, ["last_login_at", "last_login"], "Belum ada"),
    status: statusText(row),
    updated_at: row.updated_at,
  }));
  const active = rows.filter((row) => String(row.status).toLowerCase() === "active").length;
  const roles = new Set(rows.map((row) => String(row.role)).filter((role) => role !== "-")).size;

  return {
    metrics: [
      { label: "Users", value: String(rows.length), helper: "Akun terdaftar" },
      { label: "Active", value: String(active), helper: "Akun aktif" },
      { label: "Roles", value: String(roles), helper: "Role terpakai" },
    ],
    rows,
    aiNotes: [],
  };
}

export async function getAdminModuleData(moduleKey: AdminModuleKey): Promise<ModuleData> {
  return moduleKey === "companies" ? getCompaniesData() : getUsersData();
}
