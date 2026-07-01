import { Skeleton } from "./skeleton";

export function ModuleSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-5 w-[480px]" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <Skeleton className="mb-6 h-14 w-14 rounded-2xl" />

          <Skeleton className="h-7 w-56" />

          <div className="mt-5 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <Skeleton className="h-4 w-40" />

          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}