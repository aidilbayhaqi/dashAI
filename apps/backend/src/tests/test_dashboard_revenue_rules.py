from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from src.modules.dashboard.route_dashboard import (
    build_revenue_query,
    calculate_revenue_change_percent,
    resolve_dashboard_period,
)


def test_dashboard_period_defaults_to_current_month_and_equal_previous_window():
    period = resolve_dashboard_period(
        period_start=None,
        period_end=None,
        today=date(2026, 7, 12),
    )

    assert period.start_date == date(2026, 7, 1)
    assert period.end_date == date(2026, 7, 12)
    assert period.previous_start_date == date(2026, 6, 19)
    assert period.previous_end_date == date(2026, 6, 30)


def test_dashboard_period_rejects_reversed_range():
    with pytest.raises(HTTPException) as error:
        resolve_dashboard_period(
            period_start=date(2026, 7, 12),
            period_end=date(2026, 7, 1),
        )

    assert error.value.status_code == 422


def test_revenue_query_only_counts_posted_income_in_period():
    query = build_revenue_query(
        company_id=uuid4(),
        exact_branch_id=None,
        allowed_branch_ids=None,
        period_start=date(2026, 7, 1),
        period_end=date(2026, 7, 12),
    )

    sql = str(
        query.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    ).lower()

    assert "finance_transactions.transaction_type = 'income'" in sql
    assert "finance_transactions.status = 'posted'" in sql
    assert "finance_transactions.transaction_date >= '2026-07-01'" in sql
    assert "finance_transactions.transaction_date <= '2026-07-12'" in sql


def test_revenue_change_percent_handles_growth_and_empty_baseline():
    assert calculate_revenue_change_percent(
        Decimal("150"),
        Decimal("100"),
    ) == 50.0

    assert calculate_revenue_change_percent(
        Decimal("0"),
        Decimal("0"),
    ) == 0.0

    assert calculate_revenue_change_percent(
        Decimal("100"),
        Decimal("0"),
    ) is None
