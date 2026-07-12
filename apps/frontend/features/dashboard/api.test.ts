import { beforeEach, describe, expect, it, vi } from "vitest";


const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));


vi.mock("@/lib/api", () => ({
  api: apiMock,
}));


import {
  fetchDashboardSummary,
  getCurrentDashboardPeriod,
} from "./api";


const period = {
  periodStart: "2026-07-01",
  periodEnd: "2026-07-12",
};


describe("dashboard API", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
  });

  it("builds the current month period using local calendar dates", () => {
    expect(
      getCurrentDashboardPeriod(new Date(2026, 6, 12, 23, 30)),
    ).toEqual(period);
  });

  it("requests the selected company and explicit revenue period", async () => {
    apiMock.get.mockResolvedValue({
      data: {
        company_id: "company-1",
        branch_id: null,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        previous_period_start: "2026-06-19",
        previous_period_end: "2026-06-30",
        revenue_basis: "posted_income",
        total_products: 12,
        total_employees: 8,
        total_leads: 5,
        total_deals: 2,
        total_revenue: 100_000,
        previous_total_revenue: 80_000,
        revenue_change_percent: 25,
      },
    });

    await fetchDashboardSummary("company-1", period);

    expect(apiMock.get).toHaveBeenCalledWith(
      "/api/v1/dashboard/summary",
      {
        params: {
          period_start: "2026-07-01",
          period_end: "2026-07-12",
          company_id: "company-1",
        },
      },
    );
  });

  it("keeps the period but lets backend resolve all-company scope", async () => {
    apiMock.get.mockResolvedValue({
      data: {
        company_id: null,
        branch_id: null,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        previous_period_start: "2026-06-19",
        previous_period_end: "2026-06-30",
        revenue_basis: "posted_income",
        total_products: 0,
        total_employees: 0,
        total_leads: 0,
        total_deals: 0,
        total_revenue: 0,
        previous_total_revenue: 0,
        revenue_change_percent: 0,
      },
    });

    await fetchDashboardSummary("all", period);

    expect(apiMock.get).toHaveBeenCalledWith(
      "/api/v1/dashboard/summary",
      {
        params: {
          period_start: "2026-07-01",
          period_end: "2026-07-12",
        },
      },
    );
  });
});
