from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import NoReturn

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession


CONSTRAINT_MESSAGES: dict[str, str] = {
    "uq_finance_transaction_company_no": (
        "Transaction number already exists in this company"
    ),
    "uq_finance_invoice_company_no": (
        "Invoice number already exists in this company"
    ),
    "uq_payroll_company_no": (
        "Payroll number already exists in this company"
    ),
    "uq_payroll_slip_run_employee": (
        "Payroll slip for this employee already exists in the payroll run"
    ),
    "uq_product_stock_product_branch": (
        "Stock record already exists for this product and branch"
    ),
    "uq_product_category_company_code": (
        "Product category code already exists in this company"
    ),
    "uq_products_company_sku": (
        "Product SKU already exists in this company"
    ),
    "uq_hr_employee_company_no": (
        "Employee number already exists in this company"
    ),
    "uq_attendance_employee_date": (
        "Attendance for this employee and date already exists"
    ),
    "uq_kpi_review_company_employee_period": (
        "KPI review already exists for this employee and period"
    ),
    "uq_stock_movement_source": (
        "Stock movement for this source has already been processed"
    ),
}


def get_constraint_name(exc: IntegrityError) -> str | None:
    original = getattr(exc, "orig", None)
    diagnostic = getattr(original, "diag", None)
    constraint_name = getattr(diagnostic, "constraint_name", None)

    if constraint_name:
        return str(constraint_name)

    text = str(original or exc)
    for known_name in CONSTRAINT_MESSAGES:
        if known_name in text:
            return known_name

    return None


def integrity_http_exception(exc: IntegrityError) -> HTTPException:
    constraint_name = get_constraint_name(exc)
    detail = CONSTRAINT_MESSAGES.get(
        constraint_name or "",
        "Data conflicts with an existing record or database constraint",
    )

    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "message": detail,
            "constraint": constraint_name,
        },
    )


async def rollback_and_raise_integrity(
    db: AsyncSession,
    exc: IntegrityError,
) -> NoReturn:
    await db.rollback()
    raise integrity_http_exception(exc) from exc


async def commit_or_raise(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await rollback_and_raise_integrity(db, exc)
    except Exception:
        await db.rollback()
        raise


async def flush_or_raise(db: AsyncSession) -> None:
    try:
        await db.flush()
    except IntegrityError as exc:
        await rollback_and_raise_integrity(db, exc)


def ensure_non_negative(value: Decimal, *, field_name: str) -> Decimal:
    if value < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} cannot be negative",
        )
    return value


def ensure_positive(value: Decimal, *, field_name: str) -> Decimal:
    if value <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be greater than zero",
        )
    return value


def ensure_non_zero(value: Decimal, *, field_name: str) -> Decimal:
    if value == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} cannot be zero",
        )
    return value


def ensure_percentage(
    value: Decimal,
    *,
    field_name: str,
    minimum: Decimal = Decimal("0"),
    maximum: Decimal = Decimal("100"),
) -> Decimal:
    if value < minimum or value > maximum:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be between {minimum} and {maximum}",
        )
    return value


def ensure_date_range(
    start_date: date,
    end_date: date,
    *,
    start_field: str = "start_date",
    end_field: str = "end_date",
) -> None:
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{end_field} cannot be earlier than {start_field}",
        )
