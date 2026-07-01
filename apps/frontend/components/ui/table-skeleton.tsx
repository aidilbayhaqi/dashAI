import { Skeleton } from "./skeleton";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function TableSkeleton({
  rows = 8,
  columns = 5,
}: TableSkeletonProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-3 h-4 w-64" />
        </div>

        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div
          className="grid border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-24" />
          ))}
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid p-4"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <Skeleton
                  key={columnIndex}
                  className={`h-4 ${
                    columnIndex === 0
                      ? "w-32"
                      : columnIndex === columns - 1
                        ? "w-20"
                        : "w-24"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}