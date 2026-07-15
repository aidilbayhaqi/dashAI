"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  Info,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import { fetchDashboardSummary, getCurrentDashboardPeriod } from "@/features/dashboard/api";
import type { DashboardAlert } from "@/features/dashboard/types";
import { useCompanyScope } from "@/hooks/use-company-scope";
import { cn } from "@/lib/utils";

const READ_STORAGE_KEY = "dashai-read-operational-alerts";

function readStoredIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(READ_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function severityIcon(alert: DashboardAlert) {
  if (alert.severity === "critical") return CircleAlert;
  if (alert.severity === "warning") return AlertTriangle;
  return Info;
}

export function TopbarNotifications() {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedCompanyId = useCompanyScope();
  const period = useMemo(() => getCurrentDashboardPeriod(), []);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  const query = useQuery({
    queryKey: [
      "dashboard",
      "summary",
      selectedCompanyId,
      period.periodStart,
      period.periodEnd,
    ],
    queryFn: () => fetchDashboardSummary(selectedCompanyId, period),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });

  useEffect(() => {
    setReadIds(readStoredIds());
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const alerts = query.data?.operational_alerts ?? [];
  const unreadAlerts = alerts.filter((alert) => !readIds.includes(alert.id));

  function persistReadIds(ids: string[]) {
    const unique = Array.from(new Set(ids)).slice(-200);
    setReadIds(unique);
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(unique));
  }

  function markAlertRead(alert: DashboardAlert) {
    persistReadIds([...readIds, alert.id]);
    setOpen(false);
    router.push(alert.href ?? "/dashboard");
  }

  function markAllRead() {
    persistReadIds([...readIds, ...alerts.map((alert) => alert.id)]);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Buka notifikasi"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-950 dark:text-slate-300 dark:hover:border-indigo-900"
      >
        {unreadAlerts.length > 0 ? <BellRing size={18} /> : <Bell size={18} />}
        {unreadAlerts.length > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
            {Math.min(unreadAlerts.length, 99)}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Tutup notifikasi"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[110] cursor-default bg-transparent"
              />
              <section className="fixed inset-x-3 top-20 z-[120] max-h-[75vh] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.30)] sm:left-auto sm:right-5 sm:w-[390px] dark:border-slate-800 dark:bg-slate-950">
                <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">
                      Notifikasi operasional
                    </p>
                    <p className="text-xs text-slate-500">
                      {unreadAlerts.length} belum dibaca
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void query.refetch()}
                      aria-label="Refresh notifikasi"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                    >
                      <RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Tutup"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </header>

                <div className="max-h-[56vh] overflow-y-auto p-2">
                  {query.isLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm font-bold text-slate-500">
                      <Loader2 size={17} className="animate-spin" />
                      Memuat notifikasi...
                    </div>
                  ) : query.isError ? (
                    <div className="rounded-2xl bg-rose-50 px-4 py-5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      Notifikasi belum dapat dimuat. Pastikan akun memiliki akses Dashboard.
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <CheckCheck size={28} className="mx-auto text-emerald-500" />
                      <p className="mt-3 font-black text-slate-900 dark:text-white">
                        Semua aman
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Tidak ada alert operasional aktif.
                      </p>
                    </div>
                  ) : (
                    alerts.map((alert) => {
                      const Icon = severityIcon(alert);
                      const read = readIds.includes(alert.id);

                      return (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => markAlertRead(alert)}
                          className={cn(
                            "mb-1 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition last:mb-0",
                            read
                              ? "bg-transparent opacity-65 hover:bg-slate-100 dark:hover:bg-slate-900"
                              : "bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/35 dark:hover:bg-indigo-950/55",
                          )}
                        >
                          <span className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            alert.severity === "critical"
                              ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
                              : alert.severity === "warning"
                                ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
                          )}>
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-black text-slate-900 dark:text-white">
                                {alert.title}
                              </span>
                              {!read ? <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" /> : null}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {alert.description}
                            </span>
                          </span>
                          {alert.count > 0 ? (
                            <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black text-white dark:bg-white dark:text-slate-950">
                              {alert.count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>

                {alerts.length > 0 ? (
                  <footer className="border-t border-slate-200 p-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      <CheckCheck size={16} />
                      Tandai semua dibaca
                    </button>
                  </footer>
                ) : null}
              </section>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
