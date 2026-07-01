function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

export function ModuleLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/75 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/60">
        <Skeleton className="h-5 w-48" />
        <div className="mt-5 flex gap-4">
          <Skeleton className="h-14 w-14" />
          <div className="flex-1">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="mt-3 h-5 w-[520px] max-w-full" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.7rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-8 w-24" />
            <Skeleton className="mt-3 h-4 w-44" />
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="mt-3 h-4 w-72" />

        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}