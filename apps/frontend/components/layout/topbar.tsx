"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Loader2,
  LogOut,
  Menu,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { TopbarNotifications } from "@/components/layout/topbar-notifications";
import { TopbarSearch } from "@/components/layout/topbar-search";
import { logout } from "@/features/auth/api";

function formatPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Command Center";

  return segments
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" / ");
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutPending, setLogoutPending] = useState(false);

  async function handleLogout(): Promise<void> {
    if (logoutPending) return;
    setLogoutPending(true);

    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
      setLogoutPending(false);
    }
  }

  return (
    <header className="safe-area-top pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4 lg:left-[19.25rem] lg:px-0 lg:pr-4 xl:pr-6">
      <div className="pointer-events-auto mx-auto flex min-h-14 max-w-[1800px] items-center justify-between gap-3 rounded-[1.5rem] border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/50 backdrop-blur-2xl sm:min-h-16 sm:px-5 dark:border-slate-800/80 dark:bg-slate-950/88 dark:ring-slate-800/60">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Buka menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            <Menu size={19} />
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base dark:text-white">
              {formatPageTitle(pathname)}
            </p>
            <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">
              Real-time ERP workspace with read-only AI analytics.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <TopbarSearch />
          <TopbarNotifications />

          <ThemeToggle />

          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutPending}
            aria-label="Logout"
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {logoutPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
            <span className="hidden sm:inline">
              {logoutPending ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
