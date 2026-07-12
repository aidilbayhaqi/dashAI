"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles, X } from "lucide-react";

import { CurrentCompanyCard } from "@/components/layout/current-company-card";
import { dashboardNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<string[]>([
    "Command Center",
    "Operations",
    "Finance",
    "Human Capital",
    "Customers",
  ]);

  useEffect(() => {
    const activeGroup = dashboardNavigation.find((group) =>
      group.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/")
      )
    );

    if (!activeGroup) return;

    setOpenGroups((current) => {
      if (current.includes(activeGroup.group)) return current;

      return [...current, activeGroup.group];
    });
  }, [pathname]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  function toggleGroup(group: string) {
    setOpenGroups((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group]
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Tutup sidebar"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        className={[
          "fixed left-0 top-0 z-50 h-dvh w-[min(19rem,88vw)] border-r border-slate-200/70 bg-white/95 shadow-[24px_0_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-transform duration-300 dark:border-slate-800/80 dark:bg-slate-950/95 dark:shadow-none lg:z-40 lg:w-[19rem] lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
      <div className="flex h-full flex-col">
        <div className="space-y-4 px-5 py-5">
          <div className="flex justify-end lg:hidden">
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300"
            >
              <X size={18} />
            </button>
          </div>

          <Link
            href="/dashboard"
            className="block rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-950">
                <Sparkles size={21} />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">
                  DashAI
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Enterprise OS
                </p>
              </div>
            </div>
          </Link>

          <CurrentCompanyCard />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5">
          <nav className="space-y-3">
            {dashboardNavigation.map((group) => {
              const isOpen = openGroups.includes(group.group);

              return (
                <div key={group.group}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.group)}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                  >
                    <span>{group.group}</span>

                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {isOpen ? (
                    <div className="mt-1 space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;

                        const active =
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                              active
                                ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950 dark:shadow-none"
                                : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                                active
                                  ? "bg-white/15 dark:bg-slate-950/10"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-900 dark:text-slate-500 dark:group-hover:bg-white dark:group-hover:text-slate-950"
                              )}
                            >
                              <Icon size={16} />
                            </div>

                            <span className="truncate">{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
    </>
  );
}