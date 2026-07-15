"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type ModuleFilterOption = {
  value: string;
  label: string;
};

export function ModuleFilterSelect({
  ariaLabel,
  icon,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  icon: ReactNode;
  value: string;
  options: ModuleFilterOption[];
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-2xl border px-4 text-left shadow-sm transition",
          open
            ? "border-indigo-300 bg-indigo-100/80 ring-4 ring-indigo-100/60 dark:border-indigo-700 dark:bg-indigo-950/70 dark:ring-indigo-950/60"
            : "border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 hover:border-indigo-200 hover:from-indigo-100 hover:to-blue-50 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/45 dark:to-slate-950 dark:hover:border-indigo-900",
        )}
      >
        <span className="shrink-0 text-indigo-500 dark:text-indigo-300">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-700 dark:text-slate-100">
          {selected?.label ?? "Pilih"}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180 text-indigo-600 dark:text-indigo-300",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute inset-x-0 top-full z-[80] mt-2 max-h-72 overflow-y-auto rounded-2xl border border-indigo-100 bg-slate-950 p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-white/10 dark:border-slate-800"
        >
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {active ? <Check size={15} className="shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
