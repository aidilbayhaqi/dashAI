import { describe, expect, it } from "vitest";

import type { DashboardSummary } from "./types";


describe("dashboard contract", () => {
  it("keeps typed operational and comparison fields", () => {
    const contract: DashboardSummary = {
      contract_version: "2026-07",
      generated_at: "2026-07-12T00:00:00Z",
      scope: { company_id: null, branch_id: null, mode: "all_companies" },
      period: {
        start_date: "2026-07-01",
        end_date: "2026-07-12",
        previous_start_date: "2026-06-19",
        previous_end_date: "2026-06-30",
        bucket: "day",
      },
      revenue_basis: "posted_income",
      expense_basis: "posted_expense",
      kpis: {
        revenue: { current: 10, previous: 5, change_percent: 100, trend: "up" },
        expense: { current: 2, previous: 1, change_percent: 100, trend: "up" },
        net_cashflow: { current: 8, previous: 4, change_percent: 100, trend: "up" },
        total_products: 1,
        low_stock_items: 0,
        total_employees: 1,
        active_employees: 1,
        total_leads: 1,
        open_leads: 1,
        total_deals: 1,
        open_deals: 1,
        won_deals: 0,
        pipeline_value: 10,
        outstanding_invoice_amount: 0,
        overdue_invoice_count: 0,
        failed_automation_events: 0,
      },
      cashflow_series: [],
      crm_pipeline: [],
      operational_alerts: [],
      company_id: null,
      branch_id: null,
      period_start: "2026-07-01",
      period_end: "2026-07-12",
      previous_period_start: "2026-06-19",
      previous_period_end: "2026-06-30",
      total_products: 1,
      total_employees: 1,
      total_leads: 1,
      total_deals: 1,
      total_revenue: 10,
      previous_total_revenue: 5,
      revenue_change_percent: 100,
    };

    expect(contract.kpis.net_cashflow.current).toBe(8);
    expect(contract.contract_version).toBe("2026-07");
  });
});
