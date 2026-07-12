import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleCheck, Info } from "lucide-react";

import type { DashboardAlert } from "../types";
import { DashboardCard } from "./dashboard-card";

const severityClass = {
  critical: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-950 dark:bg-amber-950/20 dark:text-amber-200",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-950 dark:bg-blue-950/20 dark:text-blue-200",
};

export function OperationalAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <DashboardCard
      title="Operational alerts"
      description="Alert dihitung langsung dari invoice, stock, dan automation outbox."
    >
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {alerts.map((alert) => {
          const Icon = alert.severity === "critical"
            ? AlertTriangle
            : alert.severity === "warning"
              ? Info
              : CircleCheck;
          const content = (
            <div className={`h-full rounded-2xl border p-4 ${severityClass[alert.severity]}`}>
              <div className="flex items-start justify-between gap-3">
                <Icon size={20} className="shrink-0" />
                {alert.href ? <ArrowRight size={16} className="shrink-0" /> : null}
              </div>
              <p className="mt-4 text-sm font-black">{alert.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{alert.description}</p>
            </div>
          );

          return alert.href ? (
            <Link key={alert.id} href={alert.href} className="block transition hover:-translate-y-0.5">
              {content}
            </Link>
          ) : (
            <div key={alert.id}>{content}</div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
