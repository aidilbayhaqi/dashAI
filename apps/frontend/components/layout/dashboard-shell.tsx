"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const openSidebar = useCallback(() => setMobileSidebarOpen(true), []);

  return (
    <main className="min-h-screen overflow-x-hidden text-slate-950 dark:text-slate-100">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={closeSidebar}
      />

      <section className="min-h-screen min-w-0 lg:ml-[19rem]">
        <Topbar onMenuClick={openSidebar} />
        <div className="min-w-0 p-3 sm:p-5 lg:p-8">{children}</div>
      </section>
    </main>
  );
}
