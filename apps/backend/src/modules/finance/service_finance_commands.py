from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.finance.model_finance import (
    CashflowActivity,
    FinanceCashAccount,
    FinanceInvoice,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceTaxRecord,
    FinanceTransaction,
    InvoiceStatus,
    JournalStatus,
    TaxRecordStatus,
    TransactionStatus,
    TransactionType,
)
from src.modules.finance.schema_finance import (
    FinanceCashBalanceAdjustmentRequest,
    FinanceInvoicePaymentRequest,
    FinanceTaxPaymentRequest,
)
from src.realtime.events import publish_realtime_event_safe
from src.service.domain_integrity import commit_or_raise


ZERO = Decimal("0.00")


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


class FinanceCommandService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _transaction(
        self,
        *,
        transaction_id: UUID,
        company_id: UUID,
    ) -> FinanceTransaction:
        result = await self.db.execute(
            select(FinanceTransaction)
            .where(
                FinanceTransaction.id == transaction_id,
                FinanceTransaction.company_id == company_id,
            )
            .with_for_update()
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return item

    async def _invoice(
        self,
        *,
        invoice_id: UUID,
        company_id: UUID,
    ) -> FinanceInvoice:
        result = await self.db.execute(
            select(FinanceInvoice)
            .where(
                FinanceInvoice.id == invoice_id,
                FinanceInvoice.company_id == company_id,
            )
            .with_for_update()
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return item

    async def _journal(
        self,
        *,
        journal_id: UUID,
        company_id: UUID,
    ) -> FinanceJournalEntry:
        result = await self.db.execute(
            select(FinanceJournalEntry)
            .where(
                FinanceJournalEntry.id == journal_id,
                FinanceJournalEntry.company_id == company_id,
            )
            .with_for_update()
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Journal not found")
        return item


    async def _tax_record(
        self,
        *,
        tax_record_id: UUID,
        company_id: UUID,
    ) -> FinanceTaxRecord:
        result = await self.db.execute(
            select(FinanceTaxRecord)
            .where(
                FinanceTaxRecord.id == tax_record_id,
                FinanceTaxRecord.company_id == company_id,
            )
            .with_for_update()
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Tax record not found")
        return item

    async def _cash_account(
        self,
        *,
        cash_account_id: UUID,
        company_id: UUID,
    ) -> FinanceCashAccount:
        result = await self.db.execute(
            select(FinanceCashAccount)
            .where(
                FinanceCashAccount.id == cash_account_id,
                FinanceCashAccount.company_id == company_id,
            )
            .with_for_update()
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Cash account not found")
        if not item.is_active:
            raise _conflict("Cash account is inactive")
        return item

    @staticmethod
    def _cash_delta(transaction: FinanceTransaction) -> Decimal:
        amount = Decimal(transaction.total_amount)
        if transaction.transaction_type in {
            TransactionType.INCOME,
            TransactionType.REFUND,
        }:
            return amount
        if transaction.transaction_type in {
            TransactionType.EXPENSE,
            TransactionType.TAX_PAYMENT,
        }:
            return -amount
        return ZERO

    async def post_transaction(
        self,
        *,
        transaction_id: UUID,
        company_id: UUID,
    ) -> FinanceTransaction:
        transaction = await self._transaction(
            transaction_id=transaction_id,
            company_id=company_id,
        )
        if transaction.status == TransactionStatus.POSTED:
            return transaction
        if transaction.status != TransactionStatus.DRAFT:
            raise _conflict("Only draft transactions can be posted")
        if Decimal(transaction.total_amount) <= ZERO:
            raise _conflict("Transaction total must be greater than zero")

        if transaction.cash_account_id:
            cash_account = await self._cash_account(
                cash_account_id=transaction.cash_account_id,
                company_id=company_id,
            )
            cash_account.current_balance = (
                Decimal(cash_account.current_balance)
                + self._cash_delta(transaction)
            )

        transaction.status = TransactionStatus.POSTED
        transaction.posted_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await commit_or_raise(self.db)
        await self.db.refresh(transaction)
        await publish_realtime_event_safe(
            "finance.transaction.posted",
            {
                "id": str(transaction.id),
                "status": transaction.status.value,
                "branch_id": str(transaction.branch_id) if transaction.branch_id else None,
            },
            company_id=company_id,
            module="finance",
        )
        return transaction

    async def void_transaction(
        self,
        *,
        transaction_id: UUID,
        company_id: UUID,
    ) -> FinanceTransaction:
        transaction = await self._transaction(
            transaction_id=transaction_id,
            company_id=company_id,
        )
        if transaction.status == TransactionStatus.VOID:
            return transaction
        if transaction.status != TransactionStatus.POSTED:
            raise _conflict("Only posted transactions can be voided")

        if transaction.cash_account_id:
            cash_account = await self._cash_account(
                cash_account_id=transaction.cash_account_id,
                company_id=company_id,
            )
            cash_account.current_balance = (
                Decimal(cash_account.current_balance)
                - self._cash_delta(transaction)
            )

        transaction.status = TransactionStatus.VOID
        await commit_or_raise(self.db)
        await self.db.refresh(transaction)
        await publish_realtime_event_safe(
            "finance.transaction.voided",
            {
                "id": str(transaction.id),
                "status": transaction.status.value,
                "branch_id": str(transaction.branch_id) if transaction.branch_id else None,
            },
            company_id=company_id,
            module="finance",
        )
        return transaction

    async def cancel_transaction(
        self,
        *,
        transaction_id: UUID,
        company_id: UUID,
    ) -> FinanceTransaction:
        transaction = await self._transaction(
            transaction_id=transaction_id,
            company_id=company_id,
        )
        if transaction.status == TransactionStatus.CANCELLED:
            return transaction
        if transaction.status != TransactionStatus.DRAFT:
            raise _conflict("Only draft transactions can be cancelled")
        transaction.status = TransactionStatus.CANCELLED
        await commit_or_raise(self.db)
        await self.db.refresh(transaction)
        await publish_realtime_event_safe(
            "finance.transaction.cancelled",
            {
                "id": str(transaction.id),
                "status": transaction.status.value,
                "branch_id": str(transaction.branch_id) if transaction.branch_id else None,
            },
            company_id=company_id,
            module="finance",
        )
        return transaction

    async def send_invoice(
        self,
        *,
        invoice_id: UUID,
        company_id: UUID,
    ) -> FinanceInvoice:
        invoice = await self._invoice(invoice_id=invoice_id, company_id=company_id)
        if invoice.status == InvoiceStatus.SENT:
            return invoice
        if invoice.status != InvoiceStatus.DRAFT:
            raise _conflict("Only draft invoices can be sent")
        invoice.status = InvoiceStatus.SENT
        await commit_or_raise(self.db)
        await self.db.refresh(invoice)
        await publish_realtime_event_safe(
            "finance.invoice.sent",
            {
                "id": str(invoice.id),
                "status": invoice.status.value,
                "branch_id": str(invoice.branch_id) if invoice.branch_id else None,
            },
            company_id=company_id,
            module="finance",
        )
        return invoice

    async def record_invoice_payment(
        self,
        *,
        invoice_id: UUID,
        company_id: UUID,
        user_id: UUID,
        payload: FinanceInvoicePaymentRequest,
    ) -> FinanceInvoice:
        invoice = await self._invoice(invoice_id=invoice_id, company_id=company_id)
        if invoice.status == InvoiceStatus.CANCELLED:
            raise _conflict("Cancelled invoice cannot receive payment")
        if invoice.source_module == "sales_order":
            raise _conflict(
                "Sales-order invoice payment must use the automation confirmation workflow"
            )

        total = Decimal(invoice.total_amount)
        paid = Decimal(invoice.paid_amount)
        outstanding = max(total - paid, ZERO)
        if outstanding <= ZERO:
            invoice.status = InvoiceStatus.PAID
            return invoice

        amount = Decimal(payload.amount) if payload.amount is not None else outstanding
        if amount <= ZERO or amount > outstanding:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Payment amount must be positive and cannot exceed outstanding amount",
            )

        cash_account = None
        if payload.cash_account_id:
            cash_account = await self._cash_account(
                cash_account_id=payload.cash_account_id,
                company_id=company_id,
            )
            cash_account.current_balance = Decimal(cash_account.current_balance) + amount

        # A payment always creates a posted finance transaction. The cash
        # account is optional for externally-settled payments, but the audit
        # trail and dashboard revenue must never disappear.
        payment_transaction = FinanceTransaction(
            company_id=company_id,
            branch_id=invoice.branch_id,
            cash_account_id=cash_account.id if cash_account else None,
            transaction_no=(
                f"PAY-{invoice.invoice_no}-{uuid4().hex[:8].upper()}"
            ),
            transaction_date=payload.payment_date or date.today(),
            transaction_type=TransactionType.INCOME,
            cashflow_activity=CashflowActivity.OPERATING,
            status=TransactionStatus.POSTED,
            counterparty_name=invoice.client_name,
            reference_no=payload.reference_no or invoice.invoice_no,
            source_module="invoice_payment",
            source_id=invoice.id,
            creation_mode="command",
            subtotal_amount=amount,
            total_amount=amount,
            description=payload.notes or f"Payment for {invoice.invoice_no}",
            posted_at=datetime.now(timezone.utc).replace(tzinfo=None),
            created_by=user_id,
        )
        self.db.add(payment_transaction)

        invoice.paid_amount = paid + amount
        invoice.status = (
            InvoiceStatus.PAID
            if invoice.paid_amount >= total
            else InvoiceStatus.PARTIALLY_PAID
        )
        await commit_or_raise(self.db)
        await self.db.refresh(invoice)
        await publish_realtime_event_safe(
            "finance.invoice.payment_recorded",
            {
                "id": str(invoice.id),
                "status": invoice.status.value,
                "paid_amount": str(invoice.paid_amount),
                "branch_id": str(invoice.branch_id) if invoice.branch_id else None,
            },
            company_id=company_id,
            module="finance",
        )
        return invoice

    async def cancel_invoice(
        self,
        *,
        invoice_id: UUID,
        company_id: UUID,
    ) -> FinanceInvoice:
        invoice = await self._invoice(invoice_id=invoice_id, company_id=company_id)
        if invoice.status == InvoiceStatus.CANCELLED:
            return invoice
        if Decimal(invoice.paid_amount) > ZERO:
            raise _conflict("Paid or partially paid invoice cannot be cancelled")
        if invoice.status == InvoiceStatus.PAID:
            raise _conflict("Paid invoice cannot be cancelled")
        invoice.status = InvoiceStatus.CANCELLED
        await commit_or_raise(self.db)
        await self.db.refresh(invoice)
        await publish_realtime_event_safe(
            "finance.invoice.cancelled",
            {
                "id": str(invoice.id),
                "status": invoice.status.value,
                "branch_id": str(invoice.branch_id) if invoice.branch_id else None,
            },
            company_id=company_id,
            module="finance",
        )
        return invoice

    async def post_journal(
        self,
        *,
        journal_id: UUID,
        company_id: UUID,
    ) -> FinanceJournalEntry:
        journal = await self._journal(journal_id=journal_id, company_id=company_id)
        if journal.status == JournalStatus.POSTED:
            return journal
        if journal.status != JournalStatus.DRAFT:
            raise _conflict("Only draft journals can be posted")

        result = await self.db.execute(
            select(
                func.coalesce(func.sum(FinanceJournalLine.debit_amount), 0),
                func.coalesce(func.sum(FinanceJournalLine.credit_amount), 0),
            ).where(FinanceJournalLine.journal_entry_id == journal.id)
        )
        total_debit, total_credit = result.one()
        journal.total_debit = Decimal(total_debit)
        journal.total_credit = Decimal(total_credit)
        journal.is_balanced = (
            journal.total_debit > ZERO
            and journal.total_debit == journal.total_credit
        )
        if not journal.is_balanced:
            raise _conflict("Journal debit and credit must be equal and greater than zero")

        journal.status = JournalStatus.POSTED
        journal.posted_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await commit_or_raise(self.db)
        await self.db.refresh(journal)
        await publish_realtime_event_safe(
            "finance.journal.posted",
            {"id": str(journal.id), "status": journal.status.value},
            company_id=company_id,
            module="finance",
        )
        return journal

    async def reverse_journal(
        self,
        *,
        journal_id: UUID,
        company_id: UUID,
    ) -> FinanceJournalEntry:
        journal = await self._journal(journal_id=journal_id, company_id=company_id)
        if journal.status == JournalStatus.REVERSED:
            return journal
        if journal.status != JournalStatus.POSTED:
            raise _conflict("Only posted journals can be reversed")

        lines_result = await self.db.execute(
            select(FinanceJournalLine).where(
                FinanceJournalLine.journal_entry_id == journal.id
            )
        )
        original_lines = list(lines_result.scalars().all())
        if not original_lines:
            raise _conflict("Posted journal has no lines to reverse")

        reversal = FinanceJournalEntry(
            company_id=journal.company_id,
            period_id=journal.period_id,
            transaction_id=journal.transaction_id,
            journal_no=f"REV-{journal.journal_no}-{uuid4().hex[:6].upper()}",
            journal_date=date.today(),
            status=JournalStatus.POSTED,
            memo=f"Reversal of {journal.journal_no}: {journal.memo or ''}".strip(),
            total_debit=journal.total_credit,
            total_credit=journal.total_debit,
            is_balanced=True,
            posted_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        self.db.add(reversal)
        await self.db.flush()
        for line in original_lines:
            self.db.add(
                FinanceJournalLine(
                    journal_entry_id=reversal.id,
                    account_id=line.account_id,
                    description=f"Reversal: {line.description or journal.journal_no}",
                    debit_amount=line.credit_amount,
                    credit_amount=line.debit_amount,
                )
            )

        journal.status = JournalStatus.REVERSED
        await commit_or_raise(self.db)
        await self.db.refresh(journal)
        await publish_realtime_event_safe(
            "finance.journal.reversed",
            {
                "id": str(journal.id),
                "status": journal.status.value,
                "reversal_journal_id": str(reversal.id),
            },
            company_id=company_id,
            module="finance",
        )
        return journal

    async def adjust_cash_balance(
        self,
        *,
        cash_account_id: UUID,
        company_id: UUID,
        user_id: UUID,
        payload: FinanceCashBalanceAdjustmentRequest,
    ) -> FinanceCashAccount:
        cash_account = await self._cash_account(
            cash_account_id=cash_account_id,
            company_id=company_id,
        )
        amount = Decimal(payload.amount)
        delta = amount if payload.direction == "increase" else -amount
        cash_account.current_balance = Decimal(cash_account.current_balance) + delta

        transaction = FinanceTransaction(
            company_id=company_id,
            cash_account_id=cash_account.id,
            transaction_no=f"ADJ-{date.today():%Y%m%d}-{uuid4().hex[:8].upper()}",
            transaction_date=payload.adjustment_date or date.today(),
            transaction_type=TransactionType.ADJUSTMENT,
            cashflow_activity=CashflowActivity.OPERATING,
            status=TransactionStatus.POSTED,
            source_module="cash_balance_adjustment",
            source_id=cash_account.id,
            creation_mode="command",
            subtotal_amount=amount,
            total_amount=amount,
            description=(
                f"{payload.direction.title()} cash balance: {payload.reason}"
            ),
            posted_at=datetime.now(timezone.utc).replace(tzinfo=None),
            created_by=user_id,
        )
        self.db.add(transaction)
        await commit_or_raise(self.db)
        await self.db.refresh(cash_account)
        await publish_realtime_event_safe(
            "finance.cash_account.adjusted",
            {
                "id": str(cash_account.id),
                "direction": payload.direction,
                "amount": str(amount),
            },
            company_id=company_id,
            module="finance",
        )
        return cash_account


    async def accrue_tax_record(
        self,
        *,
        tax_record_id: UUID,
        company_id: UUID,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id, company_id=company_id
        )
        if record.status == TaxRecordStatus.ACCRUED:
            return record
        if record.status != TaxRecordStatus.DRAFT:
            raise _conflict("Only draft tax records can be accrued")
        if Decimal(record.tax_amount) <= ZERO:
            raise _conflict("Tax amount must be greater than zero")
        record.status = TaxRecordStatus.ACCRUED
        await commit_or_raise(self.db)
        await self.db.refresh(record)
        await publish_realtime_event_safe(
            "finance.tax.accrued",
            {"id": str(record.id), "status": record.status.value},
            company_id=company_id,
            module="finance",
        )
        return record

    async def pay_tax_record(
        self,
        *,
        tax_record_id: UUID,
        company_id: UUID,
        user_id: UUID,
        payload: FinanceTaxPaymentRequest,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id, company_id=company_id
        )
        if record.status == TaxRecordStatus.PAID:
            return record
        if record.status != TaxRecordStatus.ACCRUED:
            raise _conflict("Only accrued tax records can be paid")
        amount = Decimal(record.tax_amount)
        if amount <= ZERO:
            raise _conflict("Tax amount must be greater than zero")

        cash_account = None
        if payload.cash_account_id:
            cash_account = await self._cash_account(
                cash_account_id=payload.cash_account_id, company_id=company_id
            )
            cash_account.current_balance = Decimal(cash_account.current_balance) - amount

        transaction = FinanceTransaction(
            company_id=company_id,
            cash_account_id=cash_account.id if cash_account else None,
            transaction_no=f"TAX-{date.today():%Y%m%d}-{uuid4().hex[:8].upper()}",
            transaction_date=payload.payment_date or date.today(),
            transaction_type=TransactionType.TAX_PAYMENT,
            cashflow_activity=CashflowActivity.OPERATING,
            status=TransactionStatus.POSTED,
            reference_no=payload.reference_no or record.reference_no,
            source_module="tax_record",
            source_id=record.id,
            creation_mode="command",
            subtotal_amount=amount,
            total_amount=amount,
            description=payload.notes or f"Tax payment {record.tax_period}",
            posted_at=datetime.now(timezone.utc).replace(tzinfo=None),
            created_by=user_id,
        )
        self.db.add(transaction)
        record.paid_amount = amount
        record.paid_date = payload.payment_date or date.today()
        record.status = TaxRecordStatus.PAID
        if payload.reference_no:
            record.reference_no = payload.reference_no
        if payload.notes:
            record.notes = payload.notes
        await commit_or_raise(self.db)
        await self.db.refresh(record)
        await publish_realtime_event_safe(
            "finance.tax.paid",
            {"id": str(record.id), "status": record.status.value},
            company_id=company_id,
            module="finance",
        )
        return record

    async def report_tax_record(
        self,
        *,
        tax_record_id: UUID,
        company_id: UUID,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id, company_id=company_id
        )
        if record.status == TaxRecordStatus.REPORTED:
            return record
        if record.status != TaxRecordStatus.PAID:
            raise _conflict("Only paid tax records can be reported")
        record.status = TaxRecordStatus.REPORTED
        record.reported_date = date.today()
        await commit_or_raise(self.db)
        await self.db.refresh(record)
        await publish_realtime_event_safe(
            "finance.tax.reported",
            {"id": str(record.id), "status": record.status.value},
            company_id=company_id,
            module="finance",
        )
        return record

    async def cancel_tax_record(
        self,
        *,
        tax_record_id: UUID,
        company_id: UUID,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id, company_id=company_id
        )
        if record.status == TaxRecordStatus.CANCELLED:
            return record
        if record.status not in {TaxRecordStatus.DRAFT, TaxRecordStatus.ACCRUED}:
            raise _conflict("Paid or reported tax records cannot be cancelled")
        record.status = TaxRecordStatus.CANCELLED
        await commit_or_raise(self.db)
        await self.db.refresh(record)
        await publish_realtime_event_safe(
            "finance.tax.cancelled",
            {"id": str(record.id), "status": record.status.value},
            company_id=company_id,
            module="finance",
        )
        return record
