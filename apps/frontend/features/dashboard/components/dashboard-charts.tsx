"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatNumber } from "../format";
import type { DashboardSummary } from "../types";
import { DashboardCard } from "./dashboard-card";

const chartColors = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
];

export function DashboardCharts({ data }: { data: DashboardSummary }) {
  const pipelineData = data.crm_pipeline.filter((item) => item.count > 0);

  return (
    <section className="grid min-w-0 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <DashboardCard
        title="Cashflow trend"
        description="Posted income dan expense berdasarkan bucket periode dashboard."
      >
        <div className="h-80 min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.cashflow_series} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 8" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value: unknown) => formatCurrency(Number(value))} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: unknown) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-primary)" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="expense" name="Expense" stroke="var(--chart-secondary)" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="6 6" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard
        title="CRM pipeline"
        description="Jumlah dan expected value per stage."
      >
        {pipelineData.length ? (
          <>
            <div className="relative h-56 min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelineData} dataKey="count" nameKey="label" innerRadius={56} outerRadius={82} paddingAngle={4}>
                    {pipelineData.map((item, index) => (
                      <Cell key={item.key} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => formatNumber(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pipelineData.map((item, index) => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-900">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                    <span className="truncate text-xs font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-950 dark:text-white">{formatNumber(item.count)}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm font-semibold text-slate-500 dark:border-slate-800">
            Belum ada data pipeline.
          </div>
        )}
      </DashboardCard>

      <DashboardCard
        title="Operational records"
        description="Perbandingan record utama pada scope aktif."
        className="xl:col-span-2"
      >
        <div className="h-72 min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: "Products", records: data.kpis.total_products },
                { name: "Employees", records: data.kpis.total_employees },
                { name: "Open leads", records: data.kpis.open_leads },
                { name: "Deals", records: data.kpis.total_deals },
                { name: "Won deals", records: data.kpis.won_deals },
              ]}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 8" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: unknown) => formatNumber(Number(value))} />
              <Bar dataKey="records" name="Records" fill="var(--chart-primary)" radius={[12, 12, 0, 0]} maxBarSize={52} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>
    </section>
  );
}
