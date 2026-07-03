"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BrainCircuit,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Package,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const stats = [
  {
    title: "Total Revenue",
    value: "Rp 21.15 M",
    helper: "Year to date performance",
    trend: "+18.2%",
    icon: Wallet,
  },
  {
    title: "Operating Margin",
    value: "38.4%",
    helper: "Across all business units",
    trend: "+4.7%",
    icon: TrendingUp,
  },
  {
    title: "Active Clients",
    value: "536",
    helper: "Corporate and retail accounts",
    trend: "+64",
    icon: Users,
  },
  {
    title: "AI Reports",
    value: "27",
    helper: "Generated business findings",
    trend: "3 critical",
    icon: BrainCircuit,
  },
];

const revenueData = [
  { month: "Jan", revenue: 980, profit: 420 },
  { month: "Feb", revenue: 1120, profit: 510 },
  { month: "Mar", revenue: 1040, profit: 480 },
  { month: "Apr", revenue: 1320, profit: 620 },
  { month: "May", revenue: 1480, profit: 700 },
  { month: "Jun", revenue: 1410, profit: 680 },
  { month: "Jul", revenue: 1670, profit: 820 },
  { month: "Aug", revenue: 1810, profit: 910 },
  { month: "Sep", revenue: 1760, profit: 880 },
  { month: "Oct", revenue: 2010, profit: 1030 },
  { month: "Nov", revenue: 2180, profit: 1160 },
  { month: "Dec", revenue: 2360, profit: 1280 },
];

const moduleHealth = [
  { name: "Finance", value: 92 },
  { name: "Product", value: 88 },
  { name: "HR", value: 84 },
  { name: "CRM", value: 79 },
];

const segmentData = [
  { name: "Enterprise", value: 42 },
  { name: "SMB", value: 28 },
  { name: "Retail", value: 18 },
  { name: "Online", value: 12 },
];

const operations = [
  {
    title: "Invoice batch ready",
    module: "Finance",
    status: "Ready",
    value: "Rp 84.2 M",
  },
  {
    title: "Inventory reorder suggested",
    module: "Product",
    status: "Review",
    value: "18 SKU",
  },
  {
    title: "Payroll approval pending",
    module: "HR",
    status: "Pending",
    value: "1 batch",
  },
  {
    title: "Enterprise deal follow-up",
    module: "CRM",
    status: "Hot",
    value: "Rp 840 M",
  },
];

const quickActions = [
  { label: "Import Excel", icon: FileSpreadsheet },
  { label: "Generate Report", icon: BrainCircuit },
  { label: "Create Invoice", icon: CircleDollarSign },
  { label: "Review Approval", icon: ShieldCheck },
];

const colors = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "var(--chart-muted)",
  "#1d4ed8",
];

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
  }>;
};

function formatMillion(value: number | string) {
  return `Rp ${Number(value).toLocaleString("id-ID")} jt`;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-900 dark:bg-[#02040a]/95">
      {label ? (
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-600">
          {label}
        </p>
      ) : null}

      <div className="space-y-2">
        {payload.map((item) => (
          <div
            key={`${item.name}-${item.dataKey}`}
            className="flex min-w-36 items-center justify-between gap-5"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: item.color }}
              />
              <span className="text-xs font-semibold text-slate-500">
                {item.name}
              </span>
            </div>

            <span className="text-xs font-black text-slate-950 dark:text-white">
              {typeof item.value === "number"
                ? formatMillion(item.value)
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div>{action}</div> : null}
      </div>

      {children}
    </div>
  );
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("ready")) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (normalized.includes("pending") || normalized.includes("review")) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (normalized.includes("hot")) {
    return "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
        <div className="pointer-events-none absolute right-[-120px] top-[-140px] h-80 w-80 rounded-full bg-blue-700/10 blur-3xl dark:bg-blue-600/20" />
        <div className="pointer-events-none absolute bottom-[-160px] left-[30%] h-72 w-72 rounded-full bg-slate-900/5 blur-3xl dark:bg-blue-900/20" />

        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-900 dark:border-blue-950/60 dark:bg-blue-950/30 dark:text-blue-300">
              <Building2 size={14} />
              Enterprise Command Center
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white">
              Executive overview for finance, operations, people, and customers.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-500">
              Pantau kondisi bisnis secara real-time, lakukan import/export
              data, dan siapkan laporan manajemen dari satu dashboard ERP yang
              clean dan profesional.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-900 dark:bg-[#02040a] dark:hover:border-blue-950 dark:hover:bg-blue-950/20"
                >
                  <Icon className="text-[#0f2a5f] dark:text-blue-400" size={20} />
                  <p className="mt-3 text-xs font-black text-slate-700 dark:text-slate-300">
                    {action.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 dark:border-slate-900 dark:bg-[#050816]/90 dark:hover:shadow-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-500">
                    {stat.title}
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {stat.value}
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#0f2a5f] dark:bg-blue-950/30 dark:text-blue-300">
                  <Icon size={20} />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-600">
                  {stat.helper}
                </p>

                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                  <ArrowUpRight size={13} />
                  {stat.trend}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <DashboardCard
          title="Financial Performance"
          description="Revenue dan profit trend dalam juta rupiah."
          action={
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-500">
              FY 2026
            </div>
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueDashboard" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-primary)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="profitDashboard" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-secondary)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--chart-secondary)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 8"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={14}
                  tick={{
                    fill: "var(--chart-secondary)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  tick={{
                    fill: "var(--chart-secondary)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "var(--chart-muted)", strokeWidth: 1 }}
                />

                <Area
                  name="Revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-primary)"
                  strokeWidth={3}
                  fill="url(#revenueDashboard)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    strokeWidth: 3,
                    stroke: "var(--chart-tooltip-bg)",
                    fill: "var(--chart-primary)",
                  }}
                />

                <Area
                  name="Profit"
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--chart-secondary)"
                  strokeWidth={3}
                  fill="url(#profitDashboard)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    strokeWidth: 3,
                    stroke: "var(--chart-tooltip-bg)",
                    fill: "var(--chart-secondary)",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Customer Segment"
          description="Distribusi customer berdasarkan kategori."
        >
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  innerRadius={64}
                  outerRadius={88}
                  paddingAngle={5}
                  cornerRadius={10}
                  dataKey="value"
                  stroke="var(--chart-tooltip-bg)"
                  strokeWidth={4}
                >
                  {segmentData.map((_, index) => (
                    <Cell key={index} fill={colors[index % colors.length]} />
                  ))}
                </Pie>

                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-black text-slate-950 dark:text-white">
                  536
                </p>
                <p className="text-xs font-black text-slate-400 dark:text-slate-600">
                  Clients
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {segmentData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-900 dark:bg-[#02040a]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: colors[index] }}
                  />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    {item.name}
                  </span>
                </div>

                <span className="text-sm font-black text-slate-950 dark:text-white">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard
          title="Module Health"
          description="Performa utama per module ERP."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={moduleHealth}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barCategoryGap={28}
              >
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 8"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={14}
                  tick={{
                    fill: "var(--chart-secondary)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  tick={{
                    fill: "var(--chart-secondary)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(29, 78, 216, 0.08)" }}
                />

                <Bar
                  name="Score"
                  dataKey="value"
                  radius={[999, 999, 0, 0]}
                  fill="var(--chart-primary)"
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Operational Queue"
          description="Daftar pekerjaan penting yang perlu dipantau."
          action={
            <button className="rounded-2xl bg-[#0f2a5f] px-4 py-2 text-sm font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600">
              View All
            </button>
          }
        >
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-900">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-900 dark:bg-[#02040a]">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
                    Activity
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
                    Module
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
                    Value
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {operations.map((item) => (
                  <tr
                    key={item.title}
                    className="transition hover:bg-slate-50 dark:hover:bg-[#02040a]"
                  >
                    <td className="px-5 py-4 text-sm font-black text-slate-950 dark:text-white">
                      {item.title}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                      {item.module}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {item.value}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: "System Security",
            value: "Healthy",
            icon: ShieldCheck,
          },
          {
            title: "Pending Approvals",
            value: "14 Items",
            icon: CheckCircle2,
          },
          {
            title: "Upcoming Deadline",
            value: "3 Days",
            icon: CalendarClock,
          },
          {
            title: "Inventory Attention",
            value: "18 SKU",
            icon: Package,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#0f2a5f] dark:bg-blue-950/30 dark:text-blue-300">
                  <Icon size={20} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}