"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

import { DashAILogo } from "@/components/brand/dashai-logo";
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
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    );

    if (!activeGroup) return;

    setOpenGroups((current) =>
      current.includes(activeGroup.group)
        ? current
        : [...current, activeGroup.group],
    );
  }, [pathname]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  function toggleGroup(group: string) {
    setOpenGroups((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group],
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Tutup sidebar"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "safe-area-top fixed bottom-3 left-3 top-3 z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/94 shadow-[0_28px_75px_rgba(15,23,42,0.20)] ring-1 ring-slate-200/50 backdrop-blur-2xl transition-transform duration-300 lg:bottom-4 lg:left-4 lg:top-4 lg:z-40 lg:w-[17.75rem] lg:translate-x-0 dark:border-slate-800/85 dark:bg-slate-950/94 dark:ring-slate-800/60",
          mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-slate-200/70 px-4 pb-4 pt-4 dark:border-slate-800/70">
            <div className="mb-2 flex justify-end lg:hidden">
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <Link
              href="/dashboard"
              className="group flex items-center gap-3 rounded-[1.45rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/60 dark:hover:border-slate-700"
            >
              <DashAILogo
                size={48}
                showText
                subtitle="Enterprise OS"
                className="min-w-0 text-slate-950 dark:text-white"
              />
            </Link>

            <div className="mt-3">
              <CurrentCompanyCard />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <nav className="space-y-2.5">
              {dashboardNavigation.map((group) => {
                const isOpen = openGroups.includes(group.group);

                return (
                  <div key={group.group}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.group)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.17em] text-slate-400 transition hover:bg-slate-100/80 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                    >
                      <span>{group.group}</span>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {isOpen ? (
                      <div className="mt-1 space-y-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active =
                            pathname === item.href ||
                            pathname.startsWith(`${item.href}/`);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                                active
                                  ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950 dark:shadow-none"
                                  : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                                  active
                                    ? "bg-white/15 dark:bg-slate-950/10"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-900 dark:text-slate-500 dark:group-hover:bg-white dark:group-hover:text-slate-950",
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
