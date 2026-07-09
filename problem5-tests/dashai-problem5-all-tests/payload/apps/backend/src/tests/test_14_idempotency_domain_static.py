from __future__ import annotations

import inspect

import pytest
from fastapi import HTTPException

from src.main import app
from src.modules.hr.model_hr import KPIReview
from src.modules.products.model_product import ProductStockMovement
from src.security.idempotency import (
    IDEMPOTENCY_HEADER,
    get_idempotency_key,
)
from src.tests.route_utils import collect_routes


CRITICAL_POST_ROUTES = {
    "/api/v1/finance/transactions",
    "/api/v1/finance/invoices",
    "/api/v1/products/stocks",
    "/api/v1/products/stock-movements",
    "/api/v1/hr/payroll-runs",
    "/api/v1/hr/kpi-reviews",
    "/api/v1/hr/payroll-runs/{payroll_run_id}/calculate",
    "/api/v1/hr/payroll-runs/{payroll_run_id}/create-finance-transaction",
}


def _dependency_names(dependant) -> set[str]:
    names: set[str] = set()

    for dependency in dependant.dependencies:
        call = dependency.call
        names.add(getattr(call, "__name__", repr(call)))
        names.update(_dependency_names(dependency))

    return names


@pytest.mark.static
def test_critical_post_routes_require_idempotency_key():
    found: set[str] = set()
    missing_dependency: list[str] = []

    for route in collect_routes(app):
        if route.path not in CRITICAL_POST_ROUTES:
            continue
        if "POST" not in route.methods:
            continue

        found.add(route.path)
        dependencies = _dependency_names(route.dependant)

        if "get_idempotency_key" not in dependencies:
            missing_dependency.append(route.path)

    missing_routes = sorted(CRITICAL_POST_ROUTES - found)

    assert not missing_routes, (
        "Critical POST routes were not found:\n"
        + "\n".join(missing_routes)
    )
    assert not missing_dependency, (
        f"{IDEMPOTENCY_HEADER} dependency missing:\n"
        + "\n".join(sorted(missing_dependency))
    )


@pytest.mark.static
def test_idempotency_key_validation():
    assert get_idempotency_key("dashai-test-key-123") == (
        "dashai-test-key-123"
    )

    with pytest.raises(HTTPException) as missing:
        get_idempotency_key(None)
    assert missing.value.status_code == 400

    with pytest.raises(HTTPException) as invalid:
        get_idempotency_key("bad key")
    assert invalid.value.status_code == 400


@pytest.mark.static
def test_domain_unique_constraints_are_registered_in_models():
    stock_names = {
        item.name
        for item in ProductStockMovement.__table__.indexes
    }
    kpi_constraint_names = {
        item.name
        for item in KPIReview.__table__.constraints
    }

    assert "uq_stock_movement_source" in stock_names
    assert (
        "uq_kpi_review_company_employee_period"
        in kpi_constraint_names
    )


@pytest.mark.static
def test_idempotent_executor_is_async():
    from src.security.idempotency import execute_idempotent

    assert inspect.iscoroutinefunction(execute_idempotent)


@pytest.mark.static
def test_data_model_numeric_semantics():
    from decimal import Decimal
    from uuid import uuid4

    from pydantic import ValidationError

    from src.modules.hr.model_hr import ApprovalStatus
    from src.modules.hr.schema_hr import KPIReviewCreate
    from src.modules.products.schema_product import ProductStockCreate

    stock = ProductStockCreate(
        company_id=uuid4(),
        product_id=uuid4(),
        branch_id=uuid4(),
        quantity_on_hand=Decimal("1250.5000"),
        reserved_quantity=Decimal("10.0000"),
        reorder_point=Decimal("25.0000"),
    )
    assert stock.quantity_on_hand == Decimal("1250.5000")

    review = KPIReviewCreate(
        company_id=uuid4(),
        employee_id=uuid4(),
        period_start="2026-07-01",
        period_end="2026-07-31",
        total_score=Decimal("88.5000"),
        rating="a",
        status=ApprovalStatus.DRAFT,
    )
    assert review.rating == "A"
    assert review.total_score == Decimal("88.5000")

    with pytest.raises(ValidationError):
        ProductStockCreate(
            company_id=uuid4(),
            product_id=uuid4(),
            branch_id=uuid4(),
            quantity_on_hand=Decimal("5"),
            reserved_quantity=Decimal("6"),
        )
