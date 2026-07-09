from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from src.modules.finance.schema_finance import (
    FinanceInvoiceCreate,
    FinanceTransactionCreate,
)
from src.modules.hr.schema_hr import (
    AttendanceCreate,
    EmployeeCreate,
    KPIIndicatorCreate,
    KPIReviewCreate,
    LeaveRequestCreate,
    PayrollRunCreate,
)
from src.modules.products.schema_product import (
    ProductCreate,
    ProductStockCreate,
    ProductStockMovementCreate,
)


pytestmark = pytest.mark.static


def test_product_prices_are_currency_and_cannot_be_negative():
    product = ProductCreate(
        company_id=uuid4(),
        sku="TEST-VALID",
        name="Valid Product",
        cost_price=Decimal("12500.50"),
        selling_price=Decimal("15000.00"),
    )
    assert product.cost_price == Decimal("12500.50")

    with pytest.raises(ValidationError):
        ProductCreate(
            company_id=uuid4(),
            sku="TEST-NEGATIVE",
            name="Invalid Product",
            cost_price=Decimal("-1"),
        )


def test_stock_values_are_quantities_not_currency():
    stock = ProductStockCreate(
        company_id=uuid4(),
        product_id=uuid4(),
        branch_id=uuid4(),
        quantity_on_hand=Decimal("12500.5000"),
        reserved_quantity=Decimal("100.0000"),
        reorder_point=Decimal("250.0000"),
    )
    assert stock.quantity_on_hand == Decimal("12500.5000")

    with pytest.raises(ValidationError):
        ProductStockCreate(
            company_id=uuid4(),
            product_id=uuid4(),
            branch_id=uuid4(),
            quantity_on_hand=Decimal("5"),
            reserved_quantity=Decimal("6"),
        )


@pytest.mark.parametrize(
    ("movement_type", "quantity"),
    [
        ("in", Decimal("0")),
        ("out", Decimal("0")),
        ("sales", Decimal("-1")),
        ("adjustment", Decimal("0")),
    ],
)
def test_invalid_stock_movement_quantities_are_rejected(
    movement_type,
    quantity,
):
    with pytest.raises(ValidationError):
        ProductStockMovementCreate(
            company_id=uuid4(),
            branch_id=uuid4(),
            product_id=uuid4(),
            movement_type=movement_type,
            quantity=quantity,
        )


def test_employee_salary_and_dates_are_validated():
    with pytest.raises(ValidationError):
        EmployeeCreate(
            company_id=uuid4(),
            employee_no="EMP-NEG",
            full_name="Invalid Salary",
            base_salary=Decimal("-1"),
        )

    with pytest.raises(ValidationError):
        EmployeeCreate(
            company_id=uuid4(),
            employee_no="EMP-DATE",
            full_name="Invalid Dates",
            hire_date="2026-07-10",
            resign_date="2026-07-01",
        )


def test_attendance_minutes_and_time_order_are_validated():
    with pytest.raises(ValidationError):
        AttendanceCreate(
            company_id=uuid4(),
            employee_id=uuid4(),
            attendance_date="2026-07-09",
            work_minutes=-1,
        )

    with pytest.raises(ValidationError):
        AttendanceCreate(
            company_id=uuid4(),
            employee_id=uuid4(),
            attendance_date="2026-07-09",
            check_in_at="2026-07-09T17:00:00",
            check_out_at="2026-07-09T08:00:00",
        )


def test_leave_payroll_and_kpi_ranges_are_validated():
    with pytest.raises(ValidationError):
        LeaveRequestCreate(
            company_id=uuid4(),
            employee_id=uuid4(),
            leave_type_id=uuid4(),
            start_date="2026-07-10",
            end_date="2026-07-09",
            total_days=Decimal("1"),
        )

    with pytest.raises(ValidationError):
        PayrollRunCreate(
            company_id=uuid4(),
            payroll_no="PAY-INVALID-DATE",
            period_start="2026-07-31",
            period_end="2026-07-01",
        )

    with pytest.raises(ValidationError):
        PayrollRunCreate(
            company_id=uuid4(),
            payroll_no="PAY-INVALID-NET",
            period_start="2026-07-01",
            period_end="2026-07-31",
            total_gross=Decimal("100"),
            total_net=Decimal("101"),
        )

    with pytest.raises(ValidationError):
        KPIIndicatorCreate(
            company_id=uuid4(),
            code="KPI-INVALID",
            name="Invalid Weight",
            weight_percent=Decimal("101"),
        )


def test_kpi_score_is_decimal_and_rating_is_text():
    review = KPIReviewCreate(
        company_id=uuid4(),
        employee_id=uuid4(),
        period_start="2026-07-01",
        period_end="2026-07-31",
        total_score=Decimal("88.5000"),
        rating=" excellent ",
    )

    assert review.total_score == Decimal("88.5000")
    assert review.rating == "EXCELLENT"

    with pytest.raises(ValidationError):
        KPIReviewCreate(
            company_id=uuid4(),
            employee_id=uuid4(),
            period_start="2026-07-01",
            period_end="2026-07-31",
            total_score=Decimal("100.0001"),
        )


def test_finance_amounts_are_currency_and_require_positive_total():
    transaction = FinanceTransactionCreate(
        company_id=uuid4(),
        transaction_no="TRX-VALID",
        transaction_date="2026-07-09",
        transaction_type="expense",
        subtotal_amount=Decimal("100000.00"),
        total_amount=Decimal("100000.00"),
    )
    assert transaction.total_amount == Decimal("100000.00")

    with pytest.raises(ValidationError):
        FinanceTransactionCreate(
            company_id=uuid4(),
            transaction_no="TRX-ZERO",
            transaction_date="2026-07-09",
            transaction_type="expense",
            total_amount=Decimal("0"),
        )


def test_invoice_date_paid_and_total_integrity():
    with pytest.raises(ValidationError):
        FinanceInvoiceCreate(
            company_id=uuid4(),
            invoice_no="INV-DATE",
            client_name="Test Client",
            invoice_date="2026-07-10",
            due_date="2026-07-09",
            total_amount=Decimal("100"),
        )

    with pytest.raises(ValidationError):
        FinanceInvoiceCreate(
            company_id=uuid4(),
            invoice_no="INV-PAID",
            client_name="Test Client",
            invoice_date="2026-07-09",
            total_amount=Decimal("100"),
            paid_amount=Decimal("101"),
        )
