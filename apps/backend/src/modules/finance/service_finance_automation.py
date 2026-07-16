from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.automation.model_automation import DomainEventOutbox
from src.modules.finance.model_finance import (
    FinanceInvoice,
    FinanceTaxRate,
    FinanceTaxRecord,
    TaxRecordStatus,
    TaxType,
)


ZERO = Decimal("0.00")


async def record_domain_event(
    db: AsyncSession,
    *,
    company_id: UUID,
    aggregate_type: str,
    aggregate_id: UUID,
    event_type: str,
    event_key: str,
    payload: dict,
) -> DomainEventOutbox:
    result = await db.execute(
        select(DomainEventOutbox).where(
            DomainEventOutbox.event_key == event_key,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing

    event = DomainEventOutbox(
        company_id=company_id,
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        event_type=event_type,
        event_key=event_key,
        payload=payload,
    )
    db.add(event)
    await db.flush()
    return event


async def ensure_invoice_tax_record(
    db: AsyncSession,
    *,
    invoice: FinanceInvoice,
) -> FinanceTaxRecord | None:
    tax_amount = Decimal(invoice.tax_amount or 0)
    taxable_amount = Decimal(invoice.subtotal_amount or 0)
    if tax_amount <= ZERO:
        return None

    result = await db.execute(
        select(FinanceTaxRecord).where(
            FinanceTaxRecord.company_id == invoice.company_id,
            FinanceTaxRecord.reference_no == invoice.invoice_no,
            FinanceTaxRecord.tax_type == TaxType.PPN,
        )
    )
    existing = result.scalars().first()
    if existing is not None:
        return existing

    rate_result = await db.execute(
        select(FinanceTaxRate)
        .where(
            FinanceTaxRate.company_id == invoice.company_id,
            FinanceTaxRate.tax_type == TaxType.PPN,
            FinanceTaxRate.is_active.is_(True),
            FinanceTaxRate.effective_from <= invoice.invoice_date,
            (
                FinanceTaxRate.effective_to.is_(None)
                | (FinanceTaxRate.effective_to >= invoice.invoice_date)
            ),
        )
        .order_by(
            FinanceTaxRate.effective_from.desc(),
            FinanceTaxRate.created_at.desc(),
        )
        .limit(1)
    )
    tax_rate = rate_result.scalar_one_or_none()

    record = FinanceTaxRecord(
        company_id=invoice.company_id,
        tax_rate_id=tax_rate.id if tax_rate else None,
        tax_type=TaxType.PPN,
        tax_period=f"{invoice.invoice_date:%Y-%m}",
        taxable_amount=taxable_amount,
        tax_amount=tax_amount,
        paid_amount=ZERO,
        status=TaxRecordStatus.ACCRUED,
        due_date=invoice.due_date,
        reference_no=invoice.invoice_no,
        notes=f"Automatic tax accrual from invoice {invoice.invoice_no}",
    )
    db.add(record)
    await db.flush()

    await record_domain_event(
        db,
        company_id=invoice.company_id,
        aggregate_type="finance_invoice",
        aggregate_id=invoice.id,
        event_type="finance.tax.auto_accrued",
        event_key=f"invoice:{invoice.id}:tax-accrued",
        payload={
            "invoice_id": str(invoice.id),
            "invoice_no": invoice.invoice_no,
            "tax_record_id": str(record.id),
            "tax_period": record.tax_period,
            "tax_amount": str(record.tax_amount),
        },
    )
    return record
