export type TrendDirection = "up" | "down" | "flat" | "no_baseline";
export type AlertSeverity = "info" | "warning" | "critical";

export type DashboardMetricComparison = {
  current: number;
  previous: number;
  change_percent: number | null;
  trend: TrendDirection;
};

export type DashboardKpis = {
  revenue: DashboardMetricComparison;
  expense: DashboardMetricComparison;
  net_cashflow: DashboardMetricComparison;
  total_products: number;
  low_stock_items: number;
  total_employees: number;
  active_employees: number;
  total_leads: number;
  open_leads: number;
  total_deals: number;
  open_deals: number;
  won_deals: number;
  pipeline_value: number;
  outstanding_invoice_amount: number;
  overdue_invoice_count: number;
  failed_automation_events: number;
};

export type DashboardTimeSeriesPoint = {
  date: string;
  label: string;
  revenue: number;
  expense: number;
  net: number;
};

export type DashboardBreakdownItem = {
  key: string;
  label: string;
  count: number;
  amount: number;
};

export type DashboardAlert = {
  id: string;
  module: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  count: number;
  href: string | null;
};

export type DashboardSummary = {
  contract_version: "2026-07";
  generated_at: string;
  scope: {
    company_id: string | null;
    branch_id: string | null;
    mode: "company" | "all_companies";
  };
  period: {
    start_date: string;
    end_date: string;
    previous_start_date: string;
    previous_end_date: string;
    bucket: "day" | "month";
  };
  revenue_basis: "posted_income";
  expense_basis: "posted_expense";
  kpis: DashboardKpis;
  cashflow_series: DashboardTimeSeriesPoint[];
  crm_pipeline: DashboardBreakdownItem[];
  operational_alerts: DashboardAlert[];

  company_id: string | null;
  branch_id: string | null;
  period_start: string;
  period_end: string;
  previous_period_start: string;
  previous_period_end: string;
  total_products: number;
  total_employees: number;
  total_leads: number;
  total_deals: number;
  total_revenue: number;
  previous_total_revenue: number;
  revenue_change_percent: number | null;
};

export type DashboardPeriodParams = {
  periodStart: string;
  periodEnd: string;
};

export type DashboardRealtimeStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "disconnected";

export type DashboardRealtimeEvent = {
  event_id?: string;
  schema_version?: string;
  type: string;
  module?: string | null;
  company_id?: string | null;
  payload?: Record<string, unknown>;
  published_at?: string;
};

export type DashboardRealtimeState = {
  status: DashboardRealtimeStatus;
  lastEventAt: number | null;
};
