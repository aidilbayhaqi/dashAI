import { ArrowUpRight, BrainCircuit, Plus } from "lucide-react";
import type {
  ModuleAction,
  ModuleColumn,
  ModuleConfig,
  ModuleData,
  ModuleRow,
} from "@/types/modules";
import { cn } from "@/lib/utils";
import { ModuleLoading } from "./module-loading";
import { ModuleError } from "./module-error";
import { ModuleEmpty } from "./module-empty";

type ModulePageProps = ModuleConfig &
  ModuleData & {
    isLoading?: boolean;
    isError?: boolean;
    emptyMessage?: string;
    actions?: ModuleAction[];
  };

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("approved") ||
    normalized.includes("paid") ||
    normalized.includes("active") ||
    normalized.includes("completed") ||
    normalized.includes("done") ||
    normalized.includes("ready") ||
    normalized.includes("positive")
  ) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("progress") ||
    normalized.includes("scheduled") ||
    normalized.includes("probation")
  ) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (
    normalized.includes("critical") ||
    normalized.includes("overdue") ||
    normalized.includes("low") ||
    normalized.includes("failed") ||
    normalized.includes("risk") ||
    normalized.includes("late")
  ) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function ActionButton({ action }: { action: ModuleAction }) {
  const isPrimary = action.variant === "primary";

  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5",
        isPrimary
          ? "bg-slate-950 text-white shadow-slate-900/10 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
      )}
    >
      {isPrimary ? <Plus size={16} /> : null}
      {action.label}
    </button>
  );
}

function ModuleTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: ModuleColumn[];
  rows: ModuleRow[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <ModuleEmpty message={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div
        className="grid bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-400 dark:bg-slate-950/70"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid px-4 py-4 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
            }}
          >
            {columns.map((column, columnIndex) => {
              const value = row[column.key] ?? "-";
              const isStatus =
                column.key.toLowerCase().includes("status") ||
                column.label.toLowerCase().includes("status");

              return (
                <span
                  key={column.key}
                  className={cn(
                    "min-w-0 truncate pr-3",
                    columnIndex === 0
                      ? "font-bold text-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {isStatus ? (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold",
                        getStatusClass(value)
                      )}
                    >
                      {value}
                    </span>
                  ) : (
                    value
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModulePage({
  badge,
  title,
  description,
  icon: Icon,
  columns,
  metrics,
  rows,
  aiNotes,
  isLoading,
  isError,
  emptyMessage,
  actions = [
    { label: "Export", variant: "secondary" },
    { label: "Create New", variant: "primary" },
  ],
  tableTitle = "Recent Activity",
  tableDescription = "Dummy data preview sebelum integrasi API dan TanStack Table.",
}: ModulePageProps) {
  if (isLoading) return <ModuleLoading />;
  if (isError) return <ModuleError />;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/75 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
              {badge}
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950">
                <Icon size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="group rounded-[1.7rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:shadow-none"
          >
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>

            <div className="mt-3 flex items-end justify-between gap-3">
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {metric.value}
              </h2>

              {metric.trend ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ArrowUpRight size={14} />
                  {metric.trend}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {metric.helper}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                {tableTitle}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tableDescription}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
              {rows.length} records
            </div>
          </div>

          <ModuleTable
            columns={columns}
            rows={rows}
            emptyMessage={emptyMessage}
          />
        </div>

        <aside className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <BrainCircuit size={22} />
          </div>

          <h2 className="text-lg font-black tracking-tight">
            AI Recommendation
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Dummy insight sebelum integrasi AI Smart Reporting.
          </p>

          <div className="mt-6 space-y-3">
            {aiNotes.map((note) => (
              <div
                key={note}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200"
              >
                {note}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}