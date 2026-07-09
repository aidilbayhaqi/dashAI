"use client";

import {
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Bell,
  Command,
  Loader2,
  LogOut,
  Search,
} from "lucide-react";

import {
  logout,
} from "@/features/auth/api";

import {
  ThemeToggle,
} from "@/components/theme/theme-toggle";


function formatPageTitle(
  pathname: string
): string {
  const segments =
    pathname
      .split("/")
      .filter(Boolean);

  if (
    segments.length === 0
  ) {
    return "Command Center";
  }

  return segments
    .map(
      (segment) =>
        segment
          .split("-")
          .map(
            (word) =>
              word
                .charAt(0)
                .toUpperCase()
              + word.slice(1)
          )
          .join(" ")
    )
    .join(" / ");
}


export function Topbar() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const [
    logoutPending,
    setLogoutPending,
  ] = useState(false);

  async function
  handleLogout():
    Promise<void> {
    if (logoutPending) {
      return;
    }

    setLogoutPending(true);

    try {
      await logout();
    } finally {
      router.replace(
        "/login"
      );

      router.refresh();

      setLogoutPending(
        false
      );
    }
  }

  return (
    <header className="sticky top-0 z-30 px-6 pt-5 lg:px-8">
      <div className="flex h-16 items-center justify-between rounded-[1.5rem] border border-slate-200/80 bg-white/80 px-5 shadow-sm backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75">
        <div>
          <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">
            {formatPageTitle(
              pathname
            )}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time ERP workspace with AI-powered decision support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-slate-400 transition focus-within:border-slate-400 dark:border-slate-800 dark:bg-slate-900/70 md:flex">
            <Search size={17} />

            <input
              placeholder="Search anything..."
              className="w-64 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-950">
              <Command size={11} />
              K
            </div>
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Bell size={18} />
          </button>

          <ThemeToggle />

          <button
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              logoutPending
            }
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {logoutPending
              ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )
              : (
                <LogOut
                  size={16}
                />
              )}

            {logoutPending
              ? "Logging out..."
              : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}
