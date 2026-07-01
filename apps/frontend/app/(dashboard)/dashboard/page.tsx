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
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Package,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";

const stats = [
  {
    title: "Revenue YTD",
    value: "Rp 21.15 M",
    trend: "18.2% vs tahun lalu",
    status: "up",
    icon: Wallet,
  },
  {
    title: "Orders This Month",
    value: "1,248",
    trend: "12.4% MoM",
    status: "up",
    icon: Package,
  },
  {
    title: "Active Clients",
    value: "536",
    trend: "64 new clients",
    status: "up",
    icon: Users,
  },
  {
    title: "AI Findings",
    value: "27",
    trend: "3 critical alerts",
    status: "down",
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

const segmentData = [
  { name: "Retail", value: 42 },
  { name: "Corporate", value: 28 },
  { name: "Distributor", value: 18 },
  { name: "Online", value: 12 },
];

const departmentData = [
  { name: "Sales", target: 92, actual: 88 },
  { name: "Finance", target: 87, actual: 91 },
  { name: "HR", target: 78, actual: 84 },
  { name: "Ops", target: 96, actual: 90 },
  { name: "CRM", target: 83, actual: 86 },
];

const alerts = [
  {
    title: "Pelaporan PPN bulan ini",
    description: "Jatuh tempo dalam 3 hari",
    tag: "Tax",
    status: "warning",
  },
  {
    title: "Review kontrak enterprise",
    description: "Hari ini, 14:00",
    tag: "Legal",
    status: "normal",
  },
  {
    title: "3 item stok menipis",
    description: "Butuh reorder segera",
    tag: "Inventory",
    status: "danger",
  },
  {
    title: "Payroll batch menunggu approval",
    description: "Updated 2 jam lalu",
    tag: "HR",
    status: "normal",
  },
];

const aiInsights = [
  "Revenue tumbuh stabil, tapi margin profit perlu dijaga di Q4.",
  "Produk fast-moving butuh reorder lebih cepat untuk menghindari lost sales.",
  "Lead corporate memiliki conversion rate paling tinggi bulan ini.",
  "Payroll dan tax approval perlu diprioritaskan minggu ini.",
];

const segmentColors = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "var(--chart-muted)",
  "#cbd5e1",
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
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
      {label ? (
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
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
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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

function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/60">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        {action ? <div>{action}</div> : null}
      </div>

      {children}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-5 rounded-[2rem] border border-slate-200/80 bg-white/75 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/60 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
            ERP + AI Business Workspace
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white lg:text-4xl">
            Command Center
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Pantau operasional, finance, HR, CRM, inventory, dan rekomendasi AI
            dari satu dashboard eksekutif.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900">
            Export CSV
          </button>
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900">
            Print Report
          </button>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
            New Entry
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isUp = stat.status === "up";

          return (
            <div
              key={stat.title}
              className="group rounded-[1.7rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:shadow-none"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {stat.value}
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-white dark:group-hover:text-slate-950">
                  <Icon size={20} />
                </div>
              </div>

              <div
                className={`mt-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  isUp
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.trend}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <ChartCard
          title="Revenue & Profit"
          description="Tren revenue dan profit 12 bulan terakhir dalam juta rupiah."
          action={
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-950 dark:bg-white" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Revenue
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Profit
                </span>
              </div>
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
                  <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-primary)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1">
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
                  fill="url(#revenueGradient)"
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
                  fill="url(#profitGradient)"
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
        </ChartCard>

        <ChartCard
          title="Customer Segment"
          description="Distribusi revenue berdasarkan channel pelanggan."
        >
          <div className="grid items-center gap-5 md:grid-cols-[0.95fr_1.05fr] xl:grid-cols-1">
            <div className="relative h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentData}
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={5}
                    cornerRadius={10}
                    dataKey="value"
                    stroke="var(--chart-tooltip-bg)"
                    strokeWidth={4}
                  >
                    {segmentData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={segmentColors[index % segmentColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    536
                  </p>
                  <p className="text-xs font-bold text-slate-400">Clients</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {segmentData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: segmentColors[index] }}
                    />

                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {item.name}
                    </span>
                  </div>

                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ChartCard
          title="Department Performance"
          description="Perbandingan target dan aktual per divisi."
          action={
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Target
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-950 dark:bg-white" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Actual
                </span>
              </div>
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={8}
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
                  cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                />

                <Bar
                  name="Target"
                  dataKey="target"
                  radius={[999, 999, 0, 0]}
                  fill="var(--chart-muted)"
                  maxBarSize={26}
                />

                <Bar
                  name="Actual"
                  dataKey="actual"
                  radius={[999, 999, 0, 0]}
                  fill="var(--chart-primary)"
                  maxBarSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
              Alerts & Reminders
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Prioritas operasional hari ini.
            </p>

            <div className="mt-5 space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
                        alert.status === "danger"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          : alert.status === "warning"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {alert.status === "danger" ? (
                        <ShieldAlert size={17} />
                      ) : alert.status === "warning" ? (
                        <Clock3 size={17} />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-slate-950 dark:text-white">
                          {alert.title}
                        </p>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          {alert.tag}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <BrainCircuit size={22} />
            </div>

            <h2 className="text-lg font-black tracking-tight">
              AI Executive Notes
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Dummy insight sebelum integrasi AI Smart Reporting.
            </p>

            <div className="mt-6 space-y-3">
              {aiInsights.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}