"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Automation", href: "/sales-orders", icon: Workflow },
  { title: "Finance", href: "/finance", icon: ReceiptText },
  { title: "AI", href: "/ai-report", icon: BrainCircuit },
];

export function MobileBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/94 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(15,23,42,.12)] backdrop-blur-2xl lg:hidden dark:border-slate-800 dark:bg-slate-950/94"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition active:scale-95",
                active
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
              )}
            >
              <Icon size={18} />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black text-slate-500 transition hover:bg-slate-100 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-900"
          aria-label="Buka semua menu"
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
