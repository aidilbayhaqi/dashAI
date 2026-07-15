"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Rows3,
} from "lucide-react";

import { cn } from "@/lib/utils";

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function buildPaginationItems(
  currentPage: number,
  totalPages: number
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];

  if (currentPage > 4) {
    items.push("ellipsis-left");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (currentPage < totalPages - 3) {
    items.push("ellipsis-right");
  }

  items.push(totalPages);
  return items;
}

export function ModulePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startItem,
  endItem,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  if (totalItems <= 0) return null;

  const paginationItems = buildPaginationItems(currentPage, totalPages);

  function goToPage(page: number) {
    onPageChange(Math.min(Math.max(page, 1), totalPages));
  }

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-900 dark:bg-[#050816]/70 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span className="font-semibold">
          Menampilkan{" "}
          <strong className="font-black text-slate-900 dark:text-white">
            {startItem}-{endItem}
          </strong>{" "}
          dari{" "}
          <strong className="font-black text-slate-900 dark:text-white">
            {totalItems}
          </strong>{" "}
          data
        </span>

        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300">
          <Rows3 size={15} />
          Per halaman
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="bg-transparent font-black text-slate-950 outline-none dark:text-white"
            aria-label="Jumlah data per halaman"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mobile-scroll-snap flex max-w-full items-center gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
        <button
          type="button"
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-[#02040a] dark:hover:border-blue-900 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          aria-label="Halaman pertama"
          title="Halaman pertama"
        >
          <ChevronsLeft size={16} />
        </button>

        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-[#02040a] dark:hover:border-blue-900 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>

        {paginationItems.map((item) => {
          if (typeof item !== "number") {
            return (
              <span
                key={item}
                className="flex h-9 w-8 items-center justify-center text-sm font-black text-slate-400"
              >
                …
              </span>
            );
          }

          const active = item === currentPage;

          return (
            <button
              key={item}
              type="button"
              onClick={() => goToPage(item)}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-black transition",
                active
                  ? "bg-[#0f2a5f] text-white shadow-lg shadow-blue-950/15 dark:bg-blue-700"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
              )}
              aria-current={active ? "page" : undefined}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-[#02040a] dark:hover:border-blue-900 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
        >
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-[#02040a] dark:hover:border-blue-900 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          aria-label="Halaman terakhir"
          title="Halaman terakhir"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
