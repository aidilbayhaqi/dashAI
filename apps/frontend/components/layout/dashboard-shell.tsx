"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const openSidebar = useCallback(() => setMobileSidebarOpen(true), []);

  return (
    <main className="min-h-screen overflow-x-clip text-slate-950 dark:text-slate-100">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={closeSidebar} />

      <section className="min-h-screen min-w-0 lg:pl-[19.25rem]">
        <Topbar onMenuClick={openSidebar} />
        <div className="mx-auto min-w-0 max-w-[1800px] px-3 pb-28 pt-[5.9rem] sm:px-5 sm:pt-[6.65rem] lg:px-0 lg:pb-8 lg:pr-4 lg:pt-[6.85rem] xl:pr-6">
          {children}
        </div>
      </section>

      <MobileBottomNav onMenuClick={openSidebar} />
    </main>
  );
}
