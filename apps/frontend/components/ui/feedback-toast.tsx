"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type FeedbackToastState = {
  type: "success" | "error";
  title: string;
  description?: string;
} | null;

export function FeedbackToast({
  toast,
  onClose,
}: {
  toast: FeedbackToastState;
  onClose: () => void;
}) {
  if (!toast) return null;

  const success = toast.type === "success";
  const Icon = success ? CheckCircle2 : CircleAlert;

  return (
    <div
      className="fixed right-4 top-4 z-[1200] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-top-3 sm:right-6 sm:top-6"
      role={success ? "status" : "alert"}
      aria-live="polite"
    >
      <div
        className={cn(
          "overflow-hidden rounded-3xl border bg-white shadow-2xl shadow-slate-950/20 dark:bg-[#050816]",
          success
            ? "border-emerald-200 dark:border-emerald-900"
            : "border-rose-200 dark:border-rose-900"
        )}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              success
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            )}
          >
            <Icon size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-950 dark:text-white">
              {toast.title}
            </p>
            {toast.description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {toast.description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Tutup pemberitahuan"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className={cn(
            "h-1 w-full",
            success ? "bg-emerald-500" : "bg-rose-500"
          )}
        />
      </div>
    </div>
  );
}
