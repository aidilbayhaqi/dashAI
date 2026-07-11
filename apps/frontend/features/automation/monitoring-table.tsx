"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Search,
} from "lucide-react";

import { ModulePagination } from "@/components/modules/module-pagination";
import { cn } from "@/lib/utils";

import type { AutomationMonitoringRow } from "./types";

function formatMoney(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();

  if (
    ["paid", "fulfilled", "processed", "posted", "approved"].some(
      (keyword) => normalized.includes(keyword)
    )
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (
    ["draft", "pending", "sent", "partial", "unpaid"].some((keyword) =>
      normalized.includes(keyword)
    )
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300";
  }

  if (
    ["failed", "cancelled", "canceled", "void", "overdue"].some(
      (keyword) => normalized.includes(keyword)
    )
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

export function AutomationMonitoringTable({
  rows,
  isLoading,
  confirmingOrderId,
  onConfirmPayment,
}: {
  rows: AutomationMonitoringRow[];
  isLoading?: boolean;
  confirmingOrderId?: string | null;
  onConfirmPayment: (row: AutomationMonitoringRow) => void;
}) {
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [sortMode, setSortMode] = useState("updated_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const orderStatusOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.order_status).filter(Boolean))
    ).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      const searchable = [
        row.order_no,
        row.customer_name,
        row.transaction_no,
        row.invoice_no,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || searchable.includes(keyword)) &&
        (orderStatus === "all" || row.order_status === orderStatus) &&
        (paymentStatus === "all" || row.payment_status === paymentStatus)
      );
    });

    return [...result].sort((left, right) => {
      if (sortMode === "updated_asc") {
        return (
          new Date(left.updated_at).getTime() -
          new Date(right.updated_at).getTime()
        );
      }
      if (sortMode === "amount_desc") {
        return Number(right.total_amount) - Number(left.total_amount);
      }
      if (sortMode === "amount_asc") {
        return Number(left.total_amount) - Number(right.total_amount);
      }
      if (sortMode === "customer_asc") {
        return left.customer_name.localeCompare(right.customer_name);
      }

      return (
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime()
      );
    });
  }, [orderStatus, paymentStatus, rows, search, sortMode]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / pageSize)
  );

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  const startItem =
    filteredRows.length === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(
    currentPage * pageSize,
    filteredRows.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [orderStatus, pageSize, paymentStatus, search, sortMode]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="border-b border-slate-200/80 p-5 dark:border-slate-800 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Automation Monitoring
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              Product-to-cash history
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pantau Sales Order, transaksi, invoice, dan status pembayaran dalam satu tabel.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {filteredRows.length} dari {rows.length} flow
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_210px]">
          <label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari order, customer, invoice..."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            aria-label="Filter status order"
            value={orderStatus}
            onChange={(event) => setOrderStatus(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="all">Semua order</option>
            {orderStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter status pembayaran"
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="all">Semua pembayaran</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>

          <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
            <ArrowUpDown size={16} className="text-slate-400" />
            <select
              aria-label="Urutkan monitoring"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="w-full bg-transparent text-sm font-bold outline-none"
            >
              <option value="updated_desc">Update terbaru</option>
              <option value="updated_asc">Update terlama</option>
              <option value="amount_desc">Nominal terbesar</option>
              <option value="amount_asc">Nominal terkecil</option>
              <option value="customer_asc">Customer A–Z</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-950/70">
              <th className="px-5 py-4">No.</th>
              <th className="px-5 py-4">Last update</th>
              <th className="px-5 py-4">Sales order</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Transaction</th>
              <th className="px-5 py-4">Invoice</th>
              <th className="px-5 py-4">Payment</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center">
                  <Loader2 className="mx-auto animate-spin text-slate-400" size={24} />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Memuat monitoring automation...
                  </p>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-500">
                  Belum ada flow yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => {
                const confirming = confirmingOrderId === row.order_id;
                const canConfirm =
                  row.payment_status !== "paid" && Boolean(row.invoice_id);

                return (
                  <tr
                    key={row.order_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-950/50"
                  >
                    <td className="px-5 py-4 text-sm font-black text-slate-400">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                      {formatDate(row.updated_at)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950 dark:text-white">
                        {row.order_no}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.invoice_no || "Invoice belum dibuat"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                      {row.customer_name}
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-slate-950 dark:text-white">
                      {formatMoney(row.total_amount)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-black", statusClass(row.order_status))}>
                        {row.order_status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-black", statusClass(row.transaction_status))}>
                          {row.transaction_status || "waiting"}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">
                          {row.transaction_no || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-black", statusClass(row.invoice_status))}>
                          {row.invoice_status || "waiting"}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">
                          Outstanding {formatMoney(row.outstanding_amount)}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black", statusClass(row.payment_status))}>
                        <CircleDollarSign size={13} />
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canConfirm ? (
                        <button
                          type="button"
                          disabled={confirming}
                          onClick={() => onConfirmPayment(row)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {confirming ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Konfirmasi Lunas
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} /> Complete
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > 0 ? (
        <div className="border-t border-slate-200 dark:border-slate-800">
          <ModulePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRows.length}
            startItem={startItem}
            endItem={endItem}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : null}
    </section>
  );
}
