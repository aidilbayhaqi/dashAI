"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, ChevronRight, UserRound } from "lucide-react";

import { api } from "@/lib/api";
import { getCurrentCompanyId } from "@/lib/auth-scope";

type Row = Record<string, unknown>;

function normalizeObject(data: unknown): Row | null {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    data?: unknown;
    user?: unknown;
    company?: unknown;
  };

  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return record.data as Row;
  }

  if (record.user && typeof record.user === "object" && !Array.isArray(record.user)) {
    return record.user as Row;
  }

  if (
    record.company &&
    typeof record.company === "object" &&
    !Array.isArray(record.company)
  ) {
    return record.company as Row;
  }

  return data as Row;
}

function pick(row: Row | null, keys: string[], fallback = "-") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

async function fetchCurrentUser() {
  const endpoints = [
    "/api/v1/auth/me",
    "/api/v1/users/me",
    "/api/v1/me",
    "/api/v1/profile",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      return normalizeObject(response.data);
    } catch {
      // coba endpoint berikutnya
    }
  }

  return null;
}

async function fetchCurrentCompany(companyId: string) {
  const requests = [
    () => api.get(`/api/v1/companies/${companyId}`),
    () =>
      api.get("/api/v1/company", {
        params: {
          company_id: companyId,
        },
      }),
    () =>
      api.get("/api/v1/company/profile", {
        params: {
          company_id: companyId,
        },
      }),
  ];

  for (const request of requests) {
    try {
      const response = await request();
      return normalizeObject(response.data);
    } catch {
      // coba endpoint berikutnya
    }
  }

  return null;
}

export function CurrentCompanyCard() {
  const [user, setUser] = useState<Row | null>(null);
  const [company, setCompany] = useState<Row | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      const currentUser = await fetchCurrentUser();

      if (ignore) return;

      setUser(currentUser);

      const companyId =
        pick(currentUser, ["company_id", "companyId", "current_company_id"], "") ||
        getCurrentCompanyId();

      if (!companyId) return;

      const currentCompany = await fetchCurrentCompany(companyId);

      if (ignore) return;

      setCompany(currentCompany);
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  const userName = pick(user, ["name", "full_name", "username"], "Current User");
  const companyName = pick(
    company,
    ["name", "company_name", "business_name", "legal_name"],
    "Setup Company"
  );

  return (
    <Link
      href="/company-profile"
      className="group mb-5 block rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-900 dark:bg-[#050816] dark:hover:border-blue-800"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f2a5f] text-white">
          <UserRound size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
            {userName}
          </p>

          <div className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-500">
            <Building2 size={13} />
            <span className="truncate">{companyName}</span>
          </div>
        </div>

        <ChevronRight
          size={17}
          className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
        />
      </div>
    </Link>
  );
}