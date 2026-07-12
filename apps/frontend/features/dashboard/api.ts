import { api } from "@/lib/api";

import type {
  DashboardPeriodParams,
  DashboardSummary,
} from "./types";


function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


export function getCurrentDashboardPeriod(
  now = new Date(),
): DashboardPeriodParams {
  return {
    periodStart: formatLocalDate(
      new Date(now.getFullYear(), now.getMonth(), 1),
    ),
    periodEnd: formatLocalDate(now),
  };
}


export async function fetchDashboardSummary(
  companyId: string,
  period: DashboardPeriodParams = getCurrentDashboardPeriod(),
): Promise<DashboardSummary> {
  const params: Record<string, string> = {
    period_start: period.periodStart,
    period_end: period.periodEnd,
  };

  if (companyId !== "all") {
    params.company_id = companyId;
  }

  const response = await api.get<DashboardSummary>(
    "/api/v1/dashboard/summary",
    { params },
  );

  return response.data;
}
