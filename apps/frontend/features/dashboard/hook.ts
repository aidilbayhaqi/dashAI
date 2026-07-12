"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";

import { fetchDashboardSummary, getCurrentDashboardPeriod } from "./api";
import { useDashboardRealtime } from "./realtime";


export function useDashboardSummary() {
  const selectedCompanyId = useCompanyScope();
  const realtime = useDashboardRealtime(selectedCompanyId);
  const period = useMemo(() => getCurrentDashboardPeriod(), []);

  const query = useQuery({
    queryKey: [
      "dashboard",
      "summary",
      selectedCompanyId,
      period.periodStart,
      period.periodEnd,
    ],
    queryFn: () => fetchDashboardSummary(selectedCompanyId, period),
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: (failureCount: number, error: unknown) => {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 401 || status === 403 || status === 422) return false;
      return failureCount < 2;
    },
  });

  return {
    ...query,
    selectedCompanyId,
    realtimeStatus: realtime.status,
    lastRealtimeEventAt: realtime.lastEventAt,
  };
}
