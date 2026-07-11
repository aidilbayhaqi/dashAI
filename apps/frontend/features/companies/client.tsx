"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowUpDown,
  Building2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

import { ModulePagination } from "@/components/modules/module-pagination";
import {
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";

import {
  getCompanies,
  getCompanyApiError,
} from "./api";

import {
  CompanyCard,
} from "./company-card";

export function CompaniesClient() {
  const router = useRouter();

  const [
    isSuperAdmin,
    setIsSuperAdmin,
  ] = useState<boolean | null>(
    null
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(10);

  const [
    sortMode,
    setSortMode,
  ] = useState("updated_desc");

  useEffect(() => {
    setIsSuperAdmin(
      isCurrentUserSuperAdmin()
    );
  }, []);

  const companiesQuery = useQuery({
    queryKey: [
      "companies",
      "list",
    ],

    queryFn: getCompanies,

    enabled:
      isSuperAdmin === true,

    retry: false,
  });

  const companies =
    companiesQuery.data ?? [];

  const filteredCompanies =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      const matched = keyword
        ? companies.filter(
            (company) =>
              [
                company.name,
                company.legal_name,
                company.tax_number,
                company.email,
                company.phone,
                company.industry,
                company.company_size,
                company.city,
                company.province,
                company.country,
              ]
                .filter(Boolean)
                .some((value) =>
                  String(value)
                    .toLowerCase()
                    .includes(keyword)
                )
          )
        : companies;

      const timestamp = (value: unknown) => {
        const parsed = Date.parse(
          String(value ?? "")
        );

        return Number.isNaN(parsed)
          ? 0
          : parsed;
      };

      return [...matched].sort((left, right) => {
        if (sortMode === "updated_asc") {
          return (
            timestamp(left.updated_at) -
            timestamp(right.updated_at)
          );
        }

        if (sortMode === "created_desc") {
          return (
            timestamp(right.created_at) -
            timestamp(left.created_at)
          );
        }

        if (sortMode === "name_asc") {
          return left.name.localeCompare(
            right.name,
            "id",
            { sensitivity: "base" }
          );
        }

        if (sortMode === "name_desc") {
          return right.name.localeCompare(
            left.name,
            "id",
            { sensitivity: "base" }
          );
        }

        return (
          timestamp(right.updated_at) -
          timestamp(left.updated_at)
        );
      });
    }, [
      companies,
      search,
      sortMode,
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredCompanies.length /
        pageSize
    )
  );

  const paginatedCompanies =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        pageSize;

      return filteredCompanies.slice(
        startIndex,
        startIndex + pageSize
      );
    }, [
      currentPage,
      filteredCompanies,
      pageSize,
    ]);

  const paginationStart =
    filteredCompanies.length === 0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const paginationEnd = Math.min(
    currentPage * pageSize,
    filteredCompanies.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, search, sortMode]);

  useEffect(() => {
    setCurrentPage((page) =>
      Math.min(page, totalPages)
    );
  }, [totalPages]);

  if (isSuperAdmin === null) {
    return (
      <div className="min-w-0 space-y-6">
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />

        <div className="grid min-w-0 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-[1.5rem] bg-slate-200 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            <ShieldAlert size={22} />
          </div>

          <div>
            <h1 className="text-xl font-black text-rose-900 dark:text-rose-200">
              Superadmin Only
            </h1>

            <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
              Halaman Companies hanya
              dapat digunakan oleh
              superadmin.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
        <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-5 dark:border-slate-900 dark:bg-[#02040a]/70 sm:px-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div className="min-w-0">
              <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-500">
                Administration / Companies
              </div>

              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f2a5f] text-white shadow-lg shadow-blue-950/10 dark:bg-blue-700">
                  <Building2 size={24} />
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Companies
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Kelola tenant, owner,
                    user, dan branch dalam
                    satu halaman.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 dark:border-slate-900 dark:bg-[#050816] dark:text-slate-400">
              {filteredCompanies.length} of {companies.length} companies
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              Company Directory
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Klik card untuk membuka
              informasi dan mengubah
              company.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() =>
                companiesQuery.refetch()
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300"
            >
              <RefreshCw
                size={16}
                className={
                  companiesQuery.isFetching
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/companies/new"
                )
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#0f2a5f] dark:bg-white dark:text-slate-950"
            >
              <Plus size={16} />
              Add Company
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex h-11 min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-900 dark:bg-[#02040a]">
            <Search
              size={17}
              className="shrink-0 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Cari company, industry, email, atau kota..."
              className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>

          <label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-900 dark:bg-[#02040a]">
            <ArrowUpDown
              size={16}
              className="shrink-0 text-slate-400"
            />

            <span className="sr-only">
              Urutkan company
            </span>

            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(
                  event.target.value
                )
              }
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
            >
              <option value="updated_desc">
                Terbaru diperbarui
              </option>
              <option value="updated_asc">
                Terlama diperbarui
              </option>
              <option value="created_desc">
                Terbaru dibuat
              </option>
              <option value="name_asc">
                Nama A–Z
              </option>
              <option value="name_desc">
                Nama Z–A
              </option>
            </select>
          </label>
        </div>

        {companiesQuery.isLoading ? (
          <div className="grid min-w-0 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-[1.5rem] bg-slate-200 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : companiesQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {getCompanyApiError(
              companiesQuery.error
            )}
          </div>
        ) : filteredCompanies.length ===
          0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-800">
            <Building2
              size={34}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">
              Company tidak ditemukan
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Tambahkan company baru atau
              ubah kata kunci pencarian.
            </p>
          </div>
        ) : (
          <>
            <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {paginatedCompanies.map(
                (company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onOpen={() =>
                      router.push(
                        `/companies/detail?companyId=${encodeURIComponent(
                          company.id
                        )}`
                      )
                    }
                  />
                )
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-900">
              <ModulePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredCompanies.length}
                startItem={paginationStart}
                endItem={paginationEnd}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}