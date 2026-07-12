import { RefreshCw } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-error";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Memuat dashboard">
      <div className="h-64 animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-900" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={`dashboard-skeleton-${index}`}
            className="h-36 animate-pulse rounded-[1.5rem] bg-slate-200/70 dark:bg-slate-900"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-[1.75rem] bg-slate-200/70 dark:bg-slate-900" />
        <div className="h-96 animate-pulse rounded-[1.75rem] bg-slate-200/70 dark:bg-slate-900" />
      </div>
    </div>
  );
}

export function DashboardError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-950 dark:bg-rose-950/20">
      <h1 className="text-xl font-black text-rose-900 dark:text-rose-200">
        Dashboard gagal dimuat
      </h1>
      <p className="mt-2 text-sm leading-6 text-rose-700 dark:text-rose-300">
        {getApiErrorMessage(error, "Dashboard tidak dapat dimuat.")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-800"
      >
        <RefreshCw size={16} />
        Coba lagi
      </button>
    </div>
  );
}
