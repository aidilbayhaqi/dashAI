"use client";

import { CircleDollarSign, Target, Users } from "lucide-react";

const funnel = [
  {
    label: "Awareness",
    value: "1,240",
    helper: "Total audience reached",
    width: "100%",
  },
  {
    label: "Leads",
    value: "327",
    helper: "Captured prospects",
    width: "82%",
  },
  {
    label: "Qualified",
    value: "184",
    helper: "High intent leads",
    width: "64%",
  },
  {
    label: "Proposal",
    value: "68",
    helper: "Proposal sent",
    width: "48%",
  },
  {
    label: "Won",
    value: "24",
    helper: "Closed deals",
    width: "34%",
  },
];

export function CRMFunnelChart() {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-900 dark:border-blue-950/60 dark:bg-blue-950/30 dark:text-blue-300">
            <Target size={14} />
            CRM Funnel Analytics
          </div>

          <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            Sales Funnel Segitiga
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
            Visualisasi perjalanan customer dari awareness sampai closed deal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-900 dark:bg-[#02040a]">
            <Users size={17} className="text-blue-700 dark:text-blue-400" />
            <p className="mt-2 text-xs font-bold text-slate-500">Leads</p>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              327
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-900 dark:bg-[#02040a]">
            <Target size={17} className="text-blue-700 dark:text-blue-400" />
            <p className="mt-2 text-xs font-bold text-slate-500">Conversion</p>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              18.6%
            </p>
          </div>

          <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-900 dark:bg-[#02040a] md:block">
            <CircleDollarSign size={17} className="text-blue-700 dark:text-blue-400" />
            <p className="mt-2 text-xs font-bold text-slate-500">Pipeline</p>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              Rp 2.4 M
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-900 dark:bg-[#02040a]">
        <div className="space-y-3">
          {funnel.map((item, index) => (
            <div
              key={item.label}
              className="mx-auto"
              style={{ width: item.width }}
            >
              <div
                className="relative overflow-hidden rounded-2xl border border-blue-900/10 bg-[#0f2a5f] px-5 py-4 text-white shadow-lg shadow-blue-950/10 dark:bg-blue-700"
                style={{
                  clipPath:
                    index === 0
                      ? "polygon(0 0, 100% 0, 96% 100%, 4% 100%)"
                      : "polygon(4% 0, 96% 0, 100% 100%, 0 100%)",
                }}
              >
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <p className="text-sm font-black">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold text-blue-100">
                      {item.helper}
                    </p>
                  </div>

                  <p className="text-xl font-black">{item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}