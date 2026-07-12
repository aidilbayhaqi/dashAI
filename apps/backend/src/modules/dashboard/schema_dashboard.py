from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


TrendDirection = Literal["up", "down", "flat", "no_baseline"]
AlertSeverity = Literal["info", "warning", "critical"]


class DashboardScope(BaseModel):
    company_id: UUID | None = None
    branch_id: UUID | None = None
    mode: Literal["company", "all_companies"]


class DashboardPeriodResponse(BaseModel):
    start_date: date
    end_date: date
    previous_start_date: date
    previous_end_date: date
    bucket: Literal["day", "month"]


class DashboardMetricComparison(BaseModel):
    current: float = 0
    previous: float = 0
    change_percent: float | None = None
    trend: TrendDirection = "flat"


class DashboardKpis(BaseModel):
    revenue: DashboardMetricComparison
    expense: DashboardMetricComparison
    net_cashflow: DashboardMetricComparison

    total_products: int = 0
    low_stock_items: int = 0
    total_employees: int = 0
    active_employees: int = 0
    total_leads: int = 0
    open_leads: int = 0
    total_deals: int = 0
    open_deals: int = 0
    won_deals: int = 0
    pipeline_value: float = 0
    outstanding_invoice_amount: float = 0
    overdue_invoice_count: int = 0
    failed_automation_events: int = 0


class DashboardTimeSeriesPoint(BaseModel):
    date: date
    label: str
    revenue: float = 0
    expense: float = 0
    net: float = 0


class DashboardBreakdownItem(BaseModel):
    key: str
    label: str
    count: int = 0
    amount: float = 0


class DashboardAlert(BaseModel):
    id: str
    module: str
    severity: AlertSeverity
    title: str
    description: str
    count: int = 0
    href: str | None = None


class DashboardSummaryResponse(BaseModel):
    contract_version: Literal["2026-07"] = "2026-07"
    generated_at: datetime
    scope: DashboardScope
    period: DashboardPeriodResponse
    revenue_basis: Literal["posted_income"] = "posted_income"
    expense_basis: Literal["posted_expense"] = "posted_expense"
    kpis: DashboardKpis
    cashflow_series: list[DashboardTimeSeriesPoint] = Field(default_factory=list)
    crm_pipeline: list[DashboardBreakdownItem] = Field(default_factory=list)
    operational_alerts: list[DashboardAlert] = Field(default_factory=list)

    # Backward-compatible fields used by the first dashboard implementation.
    company_id: UUID | None = None
    branch_id: UUID | None = None
    period_start: date
    period_end: date
    previous_period_start: date
    previous_period_end: date
    total_products: int = 0
    total_employees: int = 0
    total_leads: int = 0
    total_deals: int = 0
    total_revenue: float = 0
    previous_total_revenue: float = 0
    revenue_change_percent: float | None = None
