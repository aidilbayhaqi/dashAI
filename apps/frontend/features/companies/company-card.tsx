"use client";

import {
  Building2,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import type { CompanyListItem } from "./types";

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

function statusClass(status: string) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/70";
  }
  if (status === "suspended") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70";
  }
  return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/70";
}

export function CompanyCard({
  company,
  onOpen,
}: {
  company: CompanyListItem;
  onOpen: () => void;
}) {
  const location = [company.city, company.province, company.country]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full min-w-0 w-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-900 dark:bg-[#02040a] dark:hover:border-slate-800"
    >
      <div className="flex min-w-0 items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f2a5f] text-sm font-black text-white dark:bg-blue-700">
            {initials(company.name) || <Building2 size={19} />}
          </div>

          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-black leading-snug text-slate-950 dark:text-white sm:text-lg">
              {company.name}
            </h3>
            <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
              {company.legal_name || company.industry || "Company tenant"}
            </p>
          </div>
        </div>

        <ChevronRight
          size={18}
          className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-1"
        />
      </div>

      <div className="flex flex-wrap gap-2 px-4 sm:px-5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${statusClass(
            company.status
          )}`}
        >
          {company.status}
        </span>
        {company.industry ? (
          <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {company.industry}
          </span>
        ) : null}
        {company.company_size ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {company.company_size}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex-1 space-y-3 border-t border-slate-100 px-4 py-4 text-xs dark:border-slate-900 sm:px-5 sm:text-sm">
        <div className="flex min-w-0 items-center gap-2.5 text-slate-500">
          <MapPin size={15} className="shrink-0" />
          <span className="truncate">{location || "-"}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 text-slate-500">
          <Mail size={15} className="shrink-0" />
          <span className="truncate">{company.email || "-"}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 text-slate-500">
          <Phone size={15} className="shrink-0" />
          <span className="truncate">{company.phone || "-"}</span>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 text-xs font-black text-slate-600 transition group-hover:bg-slate-50 group-hover:text-slate-950 dark:border-slate-900 dark:text-slate-400 dark:group-hover:bg-[#050816] dark:group-hover:text-white sm:px-5">
        Lihat detail company
      </div>
    </button>
  );
}
