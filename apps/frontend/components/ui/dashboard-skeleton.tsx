import { Skeleton } from "./skeleton";

export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-3 h-5 w-[420px]" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-7 w-24" />
              </div>

              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>

            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-52" />
              <Skeleton className="mt-3 h-4 w-72" />
            </div>

            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>

          <div className="flex h-72 items-end gap-3 rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
            {[70, 110, 85, 140, 120, 160, 105, 180, 150, 200, 165, 190].map(
              (height, index) => (
                <Skeleton
                  key={index}
                  className="flex-1 rounded-full"
                  
                />
              )
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-11/12" />
          <Skeleton className="mt-3 h-4 w-10/12" />

          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}