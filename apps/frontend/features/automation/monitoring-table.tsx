"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Loader2,
  ReceiptText,
  Search,
  ShoppingBag,
  UserRound,
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
    ["paid", "fulfilled", "processed", "posted", "approved"].some((key) =>
      normalized.includes(key),
    )
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (
    ["draft", "pending", "sent", "partial", "unpaid", "waiting"].some(
      (key) => normalized.includes(key),
    )
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300";
  }

  if (
    ["failed", "cancelled", "canceled", "void", "overdue"].some((key) =>
      normalized.includes(key),
    )
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function StatusPill({
  value,
  fallback = "waiting",
}: {
  value?: string | null;
  fallback?: string;
}) {
  const label = value || fallback;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-black capitalize",
        statusClass(label),
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function FlowState({ row }: { row: AutomationMonitoringRow }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
      <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-900/70">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <ShoppingBag size={12} /> Order
        </span>
        <StatusPill value={row.order_status} />
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-900/70">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <ReceiptText size={12} /> Transaction
        </span>
        <StatusPill value={row.transaction_status} />
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-900/70">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <FileText size={12} /> Invoice
        </span>
        <StatusPill value={row.invoice_status} />
      </div>
    </div>
  );
}

function PaymentAction({
  row,
  confirming,
  onConfirmPayment,
}: {
  row: AutomationMonitoringRow;
  confirming: boolean;
  onConfirmPayment: (row: AutomationMonitoringRow) => void;
}) {
  const canConfirm = row.payment_status !== "paid" && Boolean(row.invoice_id);

  if (!canConfirm) {
    return (
      <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 size={14} /> Lunas
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={confirming}
      onClick={() => onConfirmPayment(row)}
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
    >
      {confirming ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <CircleDollarSign size={14} />
      )}
      {confirming ? "Memproses..." : "Konfirmasi Lunas"}
    </button>
  );
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

  const orderStatusOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.order_status).filter(Boolean))).sort(),
    [rows],
  );

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
        return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
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
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
  }, [orderStatus, paymentStatus, rows, search, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  const startItem = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredRows.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [orderStatus, pageSize, paymentStatus, search, sortMode]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-sm sm:rounded-[2rem] dark:border-slate-800 dark:bg-slate-900/70">
      <div className="border-b border-slate-200/80 p-4 dark:border-slate-800 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Automation Monitoring
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              Product-to-cash history
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Pantau Sales Order, transaksi, invoice, dan pembayaran dalam satu tampilan.
            </p>
          </div>
          <div className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {filteredRows.length} dari {rows.length} flow
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(260px,1fr)_180px_180px_210px]">
          <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 sm:col-span-2 2xl:col-span-1 dark:border-slate-700 dark:bg-slate-950">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari order, customer, transaksi, invoice..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            aria-label="Filter status order"
            value={orderStatus}
            onChange={(event) => setOrderStatus(event.target.value)}
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
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
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="all">Semua pembayaran</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>

          <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 sm:col-span-2 2xl:col-span-1 dark:border-slate-700 dark:bg-slate-950">
            <ArrowUpDown size={16} className="shrink-0 text-slate-400" />
            <select
              aria-label="Urutkan monitoring"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
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

      <div className="p-3 sm:p-4 xl:p-0">
        <table className="block w-full border-separate border-spacing-y-3 xl:table xl:border-collapse xl:border-spacing-0">
          <thead className="hidden xl:table-header-group">
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-950/70">
              <th className="w-14 px-4 py-4 text-center">No.</th>
              <th className="w-36 px-4 py-4">Last update</th>
              <th className="min-w-[210px] px-4 py-4">Sales order</th>
              <th className="w-36 px-4 py-4">Total</th>
              <th className="min-w-[245px] px-4 py-4">Flow status</th>
              <th className="min-w-[170px] px-4 py-4">Payment</th>
              <th className="w-40 px-4 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="block space-y-3 xl:table-row-group xl:space-y-0 xl:divide-y xl:divide-slate-100 dark:xl:divide-slate-800">
            {isLoading ? (
              <tr className="block xl:table-row">
                <td colSpan={7} className="block px-5 py-12 text-center xl:table-cell">
                  <Loader2 className="mx-auto animate-spin text-slate-400" size={24} />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Memuat monitoring automation...
                  </p>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr className="block xl:table-row">
                <td
                  colSpan={7}
                  className="block rounded-3xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm font-semibold text-slate-500 xl:table-cell xl:rounded-none xl:border-0 dark:border-slate-700"
                >
                  Belum ada flow yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => {
                const confirming = confirmingOrderId === row.order_id;
                const sequence = (currentPage - 1) * pageSize + index + 1;

                return (
                  <tr
                    key={row.order_id}
                    className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md xl:table-row xl:rounded-none xl:border-0 xl:p-0 xl:shadow-none xl:hover:bg-slate-50/80 xl:hover:shadow-none dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:xl:bg-transparent dark:xl:hover:bg-slate-950/50"
                  >
                    <td className="hidden px-4 py-4 text-center text-sm font-black text-slate-400 xl:table-cell">
                      {sequence}
                    </td>

                    <td className="col-span-1 block rounded-2xl bg-slate-50 p-3 xl:table-cell xl:rounded-none xl:bg-transparent xl:px-4 xl:py-4 dark:bg-slate-900/70 dark:xl:bg-transparent">
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 xl:hidden">
                        <Clock3 size={12} /> Last update
                      </p>
                      <p className="text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">
                        {formatDate(row.updated_at)}
                      </p>
                    </td>

                    <td className="col-span-2 block xl:table-cell xl:px-4 xl:py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 xl:hidden">
                        Flow #{sequence}
                      </p>
                      <p className="mt-1 font-black text-slate-950 xl:mt-0 dark:text-white">
                        {row.order_no}
                      </p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <UserRound size={13} className="shrink-0" />
                        <span className="truncate">{row.customer_name}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400">
                        <span>{row.transaction_no || "Transaksi belum dibuat"}</span>
                        <span aria-hidden="true">•</span>
                        <span>{row.invoice_no || "Invoice belum dibuat"}</span>
                      </div>
                    </td>

                    <td className="col-span-1 block rounded-2xl bg-slate-50 p-3 xl:table-cell xl:rounded-none xl:bg-transparent xl:px-4 xl:py-4 dark:bg-slate-900/70 dark:xl:bg-transparent">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 xl:hidden">
                        Total
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950 xl:mt-0 dark:text-white">
                        {formatMoney(row.total_amount)}
                      </p>
                    </td>

                    <td className="col-span-2 block xl:table-cell xl:px-4 xl:py-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 xl:hidden">
                        Flow status
                      </p>
                      <FlowState row={row} />
                    </td>

                    <td className="col-span-2 block rounded-2xl border border-slate-200 p-3 xl:table-cell xl:rounded-none xl:border-0 xl:px-4 xl:py-4 dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2 xl:block">
                        <StatusPill value={row.payment_status} />
                        <div className="text-right xl:mt-2 xl:text-left">
                          <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                            {formatMoney(row.paid_amount)} paid
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            Outstanding {formatMoney(row.outstanding_amount)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="col-span-2 block xl:table-cell xl:px-4 xl:py-4 xl:text-right">
                      <PaymentAction
                        row={row}
                        confirming={confirming}
                        onConfirmPayment={onConfirmPayment}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
    </section>
  );
}
