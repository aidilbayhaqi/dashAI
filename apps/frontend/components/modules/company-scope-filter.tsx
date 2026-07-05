"use client";

import { useEffect, useState } from "react";
import { Building2, Filter, Loader2, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import {
  getSelectedCompanyId,
  setSelectedCompanyId,
} from "@/lib/company-scope";
import {
  getCurrentCompanyId,
  getCurrentUserRole,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";

type CompanyOption = {
  id: string;
  name: string;
};

function normalizeCompanies(data: unknown): CompanyOption[] {
  let rows: unknown[] = [];

  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (Array.isArray(record.items)) rows = record.items;
    else if (Array.isArray(record.data)) rows = record.data;
    else if (Array.isArray(record.results)) rows = record.results;
  }

  return rows
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;

      const id = row.id;
      const name =
        row.name ||
        row.company_name ||
        row.legal_name ||
        row.title ||
        row.email ||
        row.id;

      if (typeof id !== "string") return null;

      return {
        id,
        name: String(name ?? id),
      };
    })
    .filter((item): item is CompanyOption => Boolean(item));
}

export function CompanyScopeFilter() {
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
  const [canUseCompanyFilter, setCanUseCompanyFilter] = useState(false);

  const [roleLabel, setRoleLabel] = useState("");
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [appliedCompany, setAppliedCompany] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);

    const role = getCurrentUserRole();
    const companyId = getCurrentCompanyId();
    const selected = getSelectedCompanyId();

    setRoleLabel(role || "tidak terbaca");
    setCurrentCompanyId(companyId);

    /**
     * Kalau user punya company_id, dia dianggap owner/admin/user company.
     * Jadi jangan pakai selected company yang mungkin nyangkut dari akun superadmin.
     */
    if (companyId && !isCurrentUserSuperAdmin()) {
      setSelectedCompany("all");
      setAppliedCompany("all");
      setSelectedCompanyId("all");
      return;
    }

    setSelectedCompany(selected);
    setAppliedCompany(selected);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const explicitSuperAdmin = isCurrentUserSuperAdmin();
    const fixedCompanyId = getCurrentCompanyId();

    /**
     * Selain superadmin:
     * Kalau punya company_id, jangan fetch companies dan jangan munculkan filter.
     */
    if (!explicitSuperAdmin && fixedCompanyId) {
      setCanUseCompanyFilter(false);
      return;
    }

    let ignore = false;

    async function loadCompanies() {
      try {
        setIsLoading(true);

        const response = await api.get("/api/v1/companies");
        const options = normalizeCompanies(response.data);

        if (ignore) return;

        setCompanies(options);

        /**
         * Yang boleh lihat filter:
         * 1. Role explicit superadmin
         * 2. Tidak punya fixed company_id dan bisa akses list companies
         *
         * Ini aman untuk kasus role kamu tidak terbaca, tapi akun superadmin
         * biasanya tidak punya company_id fixed.
         */
        const shouldShowFilter =
          explicitSuperAdmin || (!fixedCompanyId && options.length > 0);

        setCanUseCompanyFilter(shouldShowFilter);
      } catch (error) {
        console.warn("Failed to fetch companies:", error);

        if (!ignore) {
          setCompanies([]);
          setCanUseCompanyFilter(false);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadCompanies();

    return () => {
      ignore = true;
    };
  }, [mounted]);

  function invalidateScopedQueries() {
    queryClient.invalidateQueries({ queryKey: ["product"] });
    queryClient.invalidateQueries({ queryKey: ["hr"] });
    queryClient.invalidateQueries({ queryKey: ["crm"] });
    queryClient.invalidateQueries({ queryKey: ["finance"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  function applyFilter() {
    setSelectedCompanyId(selectedCompany);
    setAppliedCompany(selectedCompany);
    invalidateScopedQueries();
  }

  function resetFilter() {
    setSelectedCompany("all");
    setSelectedCompanyId("all");
    setAppliedCompany("all");
    invalidateScopedQueries();
  }

  const appliedCompanyName =
    appliedCompany === "all"
      ? "All Companies"
      : companies.find((company) => company.id === appliedCompany)?.name ??
        appliedCompany;

  if (!mounted) return null;

  /**
   * Owner / admin company / user biasa
   */
  if (!canUseCompanyFilter) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-600 dark:bg-[#02040a] dark:text-slate-300">
            <Building2 size={16} />
            Company Fixed
          </div>

          <p className="text-sm font-bold text-slate-500 dark:text-slate-500">
            Data otomatis mengikuti company akun ini.
            {currentCompanyId ? (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500 dark:bg-slate-900">
                {currentCompanyId.slice(0, 8)}...
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                company_id belum terbaca
              </span>
            )}
          </p>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            Role: {roleLabel}
          </span>
        </div>
      </div>
    );
  }

  /**
   * Superadmin
   */
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0f2a5f] px-4 text-sm font-black text-white dark:bg-blue-700">
            <Filter size={16} />
            Filter Data Company
          </div>

          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-500">
            Superadmin bisa pilih company lalu klik tombol Terapkan Filter.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            value={selectedCompany}
            onChange={(event) => setSelectedCompany(event.target.value)}
            disabled={isLoading}
            className="h-11 min-w-[280px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-900 dark:bg-[#02040a] dark:text-white dark:disabled:bg-slate-900"
          >
            <option value="all">
              {isLoading ? "Loading companies..." : "All Companies"}
            </option>

            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={applyFilter}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            Terapkan Filter
          </button>

          <button
            type="button"
            onClick={resetFilter}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

    </div>
  );
}