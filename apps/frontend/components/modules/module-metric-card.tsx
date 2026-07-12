import type { ModuleMetric } from "@/types/modules";

export function ModuleMetricCard({ metric }: { metric: ModuleMetric }) {
  return (
    <article className="rounded-[1.45rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 dark:border-slate-900 dark:bg-[#050816]/90 dark:hover:shadow-none">
      <p className="text-sm font-bold text-slate-500 dark:text-slate-500">
        {metric.label}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {metric.value}
        </h2>

        {metric.trend ? (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            {metric.trend}
          </span>
        ) : null}
      </div>

      {metric.helper ? (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-500">
          {metric.helper}
        </p>
      ) : null}
    </article>
  );
}
