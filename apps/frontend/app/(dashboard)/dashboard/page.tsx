"use client";

import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  ContactRound,
  Package,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";

import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
import { DashboardError, DashboardSkeleton } from "@/features/dashboard/components/dashboard-states";
import { DashboardKpiGrid } from "@/features/dashboard/components/kpi-grid";
import { OperationalAlerts } from "@/features/dashboard/components/operational-alerts";
import { RealtimeBadge } from "@/features/dashboard/components/realtime-badge";
import { formatPeriod, formatTimestamp } from "@/features/dashboard/format";
import { useDashboardSummary } from "@/features/dashboard/hook";

const quickLinks = [
  { label: "Finance", description: "Transaksi dan invoice", href: "/finance/transactions", icon: CircleDollarSign },
  { label: "Products", description: "Produk dan stock", href: "/products", icon: Package },
  { label: "Employees", description: "Data karyawan", href: "/hr/employees", icon: Users },
  { label: "CRM", description: "Leads dan pipeline", href: "/crm/leads", icon: ContactRound },
];

export default function DashboardPage() {
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
    selectedCompanyId,
    realtimeStatus,
    lastRealtimeEventAt,
  } = useDashboardSummary();

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) {
    return <DashboardError error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-900 dark:bg-[#050816]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-700/10 blur-3xl dark:bg-blue-600/20" />
        <div className="relative grid gap-7 xl:grid-cols-[1fr_0.9fr] xl:items-end">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-900 dark:border-blue-950/60 dark:bg-blue-950/30 dark:text-blue-300">
                <Radio size={14} /> Live ERP Dashboard
              </span>
              <RealtimeBadge status={realtimeStatus} />
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Data operasional, cashflow, dan pipeline dalam satu contract API.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
              Scope {selectedCompanyId === "all" ? "seluruh company yang diizinkan" : "company aktif"} · {formatPeriod(data.period.start_date, data.period.end_date)} · contract {data.contract_version}.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <span>Generated {formatTimestamp(Date.parse(data.generated_at))}</span>
              <span>Last event {formatTimestamp(lastRealtimeEventAt)}</span>
              {isFetching ? <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300"><RefreshCw className="animate-spin" size={13} />Sinkronisasi</span> : null}
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60 dark:border-slate-800"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-900 dark:bg-[#02040a]/90 dark:hover:border-blue-950 dark:hover:bg-blue-950/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0f2a5f] dark:bg-blue-950/30 dark:text-blue-300"><Icon size={19} /></div>
                    <ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-700" />
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <DashboardKpiGrid data={data} />
      <DashboardCharts data={data} />
      <OperationalAlerts alerts={data.operational_alerts} />
    </div>
  );
}
