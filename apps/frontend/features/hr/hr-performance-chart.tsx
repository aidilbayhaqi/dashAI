"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, TrendingUp, Users } from "lucide-react";

const data = [
  { name: "Andi", kpi: 92, attendance: 96, productivity: 88 },
  { name: "Nadia", kpi: 88, attendance: 94, productivity: 91 },
  { name: "Riko", kpi: 74, attendance: 89, productivity: 78 },
  { name: "Sinta", kpi: 86, attendance: 97, productivity: 84 },
  { name: "Bima", kpi: 81, attendance: 92, productivity: 80 },
];

export function HRPerformanceChart() {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-900 dark:border-blue-950/60 dark:bg-blue-950/30 dark:text-blue-300">
            <Users size={14} />
            HR Performance Analytics
          </div>

          <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            Employee Performance Overview
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
            Grafik KPI, attendance, dan productivity karyawan.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-900 dark:bg-[#02040a]">
            <Award size={17} className="text-blue-700 dark:text-blue-400" />
            <p className="mt-2 text-xs font-bold text-slate-500">Avg KPI</p>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              84.2%
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-900 dark:bg-[#02040a]">
            <TrendingUp size={17} className="text-blue-700 dark:text-blue-400" />
            <p className="mt-2 text-xs font-bold text-slate-500">Attendance</p>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              93.6%
            </p>
          </div>

          <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-900 dark:bg-[#02040a] md:block">
            <Users size={17} className="text-blue-700 dark:text-blue-400" />
            <p className="mt-2 text-xs font-bold text-slate-500">Reviewed</p>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              48
            </p>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              cursor={{ fill: "rgba(29, 78, 216, 0.08)" }}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid var(--app-border)",
                background: "var(--chart-tooltip-bg)",
              }}
            />

            <Bar
              name="KPI"
              dataKey="kpi"
              fill="var(--chart-primary)"
              radius={[999, 999, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              name="Attendance"
              dataKey="attendance"
              fill="var(--chart-secondary)"
              radius={[999, 999, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              name="Productivity"
              dataKey="productivity"
              fill="var(--chart-muted)"
              radius={[999, 999, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}