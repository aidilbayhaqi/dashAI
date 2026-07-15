"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ModuleIcon } from "@/types/modules";

export type RowActionMenuItem = {
  label: string;
  icon?: ModuleIcon;
  disabled?: boolean;
  href?: string;
  onClick?: () => void | Promise<void>;
  variant?: "default" | "primary" | "danger";
};

export function RowActionMenu({
  items,
  label = "Buka menu aksi",
}: {
  items: RowActionMenuItem[];
  label?: string;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 224;
    const estimatedHeight = Math.min(360, Math.max(84, items.length * 44 + 24));
    const gap = 8;
    const viewportPadding = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= estimatedHeight + gap
      ? rect.bottom + gap
      : Math.max(viewportPadding, rect.top - estimatedHeight - gap);

    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - menuWidth),
    );

    setPosition({ top, left });
  }, [items.length, open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleViewportChange() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  async function runItem(item: RowActionMenuItem) {
    if (item.disabled) return;
    setOpen(false);

    if (item.href) {
      router.push(item.href);
      return;
    }

    await item.onClick?.();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition",
          open
            ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-[#050816] dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40",
        )}
      >
        <MoreHorizontal size={19} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: 224,
              }}
              className="z-[120] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-950 dark:ring-white/5"
            >
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => void runItem(item)}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45",
                      item.variant === "danger"
                        ? "text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        : item.variant === "primary"
                          ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
                    )}
                  >
                    {Icon ? <Icon size={16} className="shrink-0" /> : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
