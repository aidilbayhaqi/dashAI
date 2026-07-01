"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { dashboardNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
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

    if (activeGroup && !openGroups.includes(activeGroup.group)) {
      setOpenGroups((current) => [...current, activeGroup.group]);
    }
  }, [pathname, openGroups]);

  function toggleGroup(group: string) {
    setOpenGroups((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group]
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-76 border-r border-slate-200/70 bg-white/80 shadow-[24px_0_80px_rgba(15,23,42,0.04)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75 dark:shadow-none">
      <div className="flex h-full flex-col">
        <div className="px-5 py-5">
          <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-950">
                <Sparkles size={21} />
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                  DashAI
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Enterprise OS
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Active Workspace
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Main Company
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <nav className="space-y-3">
            {dashboardNavigation.map((group) => {
              const isOpen = openGroups.includes(group.group);

              return (
                <div key={group.group}>
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                  >
                    <span>{group.group}</span>
                    <ChevronDown
                      size={14}
                      className={cn("transition", isOpen && "rotate-180")}
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
                                "flex h-8 w-8 items-center justify-center rounded-xl transition",
                                active
                                  ? "bg-white/15 dark:bg-slate-950/10"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-900 dark:text-slate-500 dark:group-hover:bg-white dark:group-hover:text-slate-950"
                              )}
                            >
                              <Icon size={16} />
                            </div>

                            <span>{item.title}</span>
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

        <div className="p-4">
          <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-950 p-4 text-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold">AI Business Assistant</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Smart reporting, anomaly detection, dan rekomendasi bisnis.
            </p>

            <div className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold">
              12 insight generated
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}