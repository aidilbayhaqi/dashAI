import { LucideIcon } from "lucide-react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  items?: string[];
};

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  items = [],
}: ModulePlaceholderProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
          <Icon size={24} />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            UI Ready
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            API Next Step
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            TanStack Table
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Planned Tasks
        </h3>

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}