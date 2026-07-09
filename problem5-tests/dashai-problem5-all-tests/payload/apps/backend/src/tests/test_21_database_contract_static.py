from __future__ import annotations

from pathlib import Path

import pytest

from src.modules.finance.model_finance import (
    FinanceInvoice,
    FinanceTransaction,
)
from src.modules.hr.model_hr import (
    AttendanceRecord,
    Employee,
    KPIReview,
    PayrollRun,
    PayrollSlip,
)
from src.modules.products.model_product import (
    Product,
    ProductCategory,
    ProductStock,
    ProductStockMovement,
)


pytestmark = pytest.mark.static


def _database_object_names(model_class) -> set[str]:
    names = {
        item.name
        for item in model_class.__table__.constraints
        if item.name
    }
    names.update(
        item.name
        for item in model_class.__table__.indexes
        if item.name
    )
    return names


@pytest.mark.parametrize(
    ("model_class", "expected_name"),
    [
        (
            ProductCategory,
            "uq_product_category_company_code",
        ),
        (
            Product,
            "uq_products_company_sku",
        ),
        (
            ProductStock,
            "uq_product_stock_product_branch",
        ),
        (
            ProductStockMovement,
            "uq_stock_movement_source",
        ),
        (
            Employee,
            "uq_hr_employee_company_no",
        ),
        (
            AttendanceRecord,
            "uq_attendance_employee_date",
        ),
        (
            PayrollRun,
            "uq_payroll_company_no",
        ),
        (
            PayrollSlip,
            "uq_payroll_slip_run_employee",
        ),
        (
            KPIReview,
            "uq_kpi_review_company_employee_period",
        ),
        (
            FinanceTransaction,
            "uq_finance_transaction_company_no",
        ),
        (
            FinanceInvoice,
            "uq_finance_invoice_company_no",
        ),
    ],
)
def test_critical_unique_constraints_exist(
    model_class,
    expected_name,
):
    assert expected_name in _database_object_names(model_class)


def test_numeric_column_scales_match_business_meaning():
    assert Product.cost_price.type.scale == 2
    assert Product.selling_price.type.scale == 2

    assert ProductStock.quantity_on_hand.type.scale == 4
    assert ProductStock.reserved_quantity.type.scale == 4
    assert ProductStock.reorder_point.type.scale == 4

    assert Employee.base_salary.type.scale == 2
    assert KPIReview.total_score.type.scale == 4

    assert FinanceTransaction.total_amount.type.scale == 2
    assert FinanceInvoice.total_amount.type.scale == 2


def test_problem5_migration_contains_critical_constraints():
    backend_root = Path(__file__).resolve().parents[2]
    versions = backend_root / "migrations" / "versions"

    migration_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in versions.glob("*.py")
    )

    expected = {
        "uq_kpi_review_company_employee_period",
        "uq_stock_movement_source",
        "uq_payroll_slip_run_employee",
    }

    missing = sorted(
        name for name in expected if name not in migration_text
    )
    assert not missing, (
        "Critical Problem 5 constraints are absent from migrations: "
        + ", ".join(missing)
    )
