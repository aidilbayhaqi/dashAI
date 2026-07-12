from datetime import date, datetime, timezone

from src.ai.service_ai import build_rule_based_answer, build_rule_based_summary
from src.modules.dashboard.schema_dashboard import (
    DashboardKpis,
    DashboardMetricComparison,
    DashboardPeriodResponse,
    DashboardScope,
    DashboardSummaryResponse,
)


def metric(current: float, previous: float = 0) -> DashboardMetricComparison:
    return DashboardMetricComparison(
        current=current,
        previous=previous,
        change_percent=None if previous == 0 and current else 0,
        trend="no_baseline" if previous == 0 and current else "flat",
    )


def dashboard_fixture() -> DashboardSummaryResponse:
    return DashboardSummaryResponse(
        generated_at=datetime.now(timezone.utc),
        scope=DashboardScope(
            company_id=None,
            branch_id=None,
            mode="all_companies",
        ),
        period=DashboardPeriodResponse(
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 12),
            previous_start_date=date(2026, 6, 19),
            previous_end_date=date(2026, 6, 30),
            bucket="day",
        ),
        kpis=DashboardKpis(
            revenue=metric(100_000, 120_000),
            expense=metric(60_000, 50_000),
            net_cashflow=metric(40_000, 70_000),
            total_products=20,
            low_stock_items=2,
            total_employees=5,
            active_employees=5,
            total_leads=4,
            open_leads=4,
            total_deals=0,
            open_deals=0,
            won_deals=0,
            pipeline_value=0,
            outstanding_invoice_amount=25_000,
            overdue_invoice_count=1,
            failed_automation_events=1,
        ),
        period_start=date(2026, 7, 1),
        period_end=date(2026, 7, 12),
        previous_period_start=date(2026, 6, 19),
        previous_period_end=date(2026, 6, 30),
    )


def test_ai_summary_is_read_only_and_flags_operational_risks():
    response = build_rule_based_summary(dashboard_fixture())

    assert response.mode == "read_only"
    assert response.provider == "rules"
    assert response.health_score < 100
    assert any(item.id == "overdue-invoices" for item in response.findings)
    assert any(item.id == "failed-automation" for item in response.findings)
    assert all("tidak mengubah data" in item.lower() or "tidak ada write" in item.lower() or "diverifikasi" in item.lower() for item in response.guardrails)


def test_ai_answer_uses_dashboard_evidence_without_write_action():
    response = build_rule_based_answer(
        "Bagaimana kondisi invoice overdue?",
        dashboard_fixture(),
    )

    assert response.mode == "read_only"
    assert "1 invoice overdue" in response.answer
    assert response.suggested_links == ["/finance/invoices"]
