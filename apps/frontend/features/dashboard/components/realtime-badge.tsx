import { Wifi, WifiOff } from "lucide-react";

import type { DashboardRealtimeStatus } from "../types";

export function RealtimeBadge({ status }: { status: DashboardRealtimeStatus }) {
  const connected = status === "connected";
  const label: Record<DashboardRealtimeStatus, string> = {
    connected: "Realtime connected",
    connecting: "Connecting realtime",
    reconnecting: "Reconnecting realtime",
    offline: "Browser offline",
    disconnected: "Realtime paused",
  };
  const Icon = connected ? Wifi : WifiOff;

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black",
        connected
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      ].join(" ")}
    >
      <Icon size={14} />
      {label[status]}
    </span>
  );
}
