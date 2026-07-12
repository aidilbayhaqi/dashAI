import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  Boxes,
  CircleDollarSign,
  ContactRound,
  ReceiptText,
} from "lucide-react";

import { formatCurrency, formatNumber, formatTrend } from "../format";
import type { DashboardSummary } from "../types";

export function DashboardKpiGrid({ data }: { data: DashboardSummary }) {
  const kpis = data.kpis;
  const items = [
    {
      label: "Revenue",
      value: formatCurrency(kpis.revenue.current),
      helper: formatTrend(kpis.revenue.change_percent),
      icon: BanknoteArrowUp,
    },
    {
      label: "Expense",
      value: formatCurrency(kpis.expense.current),
      helper: formatTrend(kpis.expense.change_percent),
      icon: BanknoteArrowDown,
    },
    {
      label: "Net cashflow",
      value: formatCurrency(kpis.net_cashflow.current),
      helper: formatTrend(kpis.net_cashflow.change_percent),
      icon: CircleDollarSign,
    },
    {
      label: "Pipeline",
      value: formatCurrency(kpis.pipeline_value),
      helper: `${formatNumber(kpis.open_deals)} deal aktif`,
      icon: ContactRound,
    },
    {
      label: "Outstanding invoice",
      value: formatCurrency(kpis.outstanding_invoice_amount),
      helper: `${formatNumber(kpis.overdue_invoice_count)} overdue`,
      icon: ReceiptText,
    },
    {
      label: "Low stock",
      value: formatNumber(kpis.low_stock_items),
      helper: `${formatNumber(kpis.total_products)} total produk`,
      icon: Boxes,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article
            key={item.label}
            className="min-w-0 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-900 dark:bg-[#050816]/90"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500">{item.label}</p>
                <h2 className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {item.value}
                </h2>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0f2a5f] dark:bg-blue-950/30 dark:text-blue-300">
                <Icon size={20} />
              </div>
            </div>
            <p className="mt-5 text-xs font-semibold leading-5 text-slate-500">
              {item.helper}
            </p>
          </article>
        );
      })}
    </section>
  );
}
