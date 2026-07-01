import type { CSSProperties } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={[
        "animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}