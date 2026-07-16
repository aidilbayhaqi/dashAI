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
from src.modules.finance.service_accounting_bridge import AccountingBridgeService
from src.modules.finance.service_finance_automation import (
    ensure_invoice_tax_record,
    record_domain_event,
)
from src.modules.finance.schema_finance import (
    FinanceCashBalanceAdjustmentRequest,
    FinanceInvoicePaymentRequest,
    FinanceTaxPaymentRequest,
)
from src.realtime.events import publish_realtime_event_safe
from src.service.domain_integrity import commit_or_raise


ZERO = Decimal("0.00")
AUTOMATION_OWNED_SOURCES = {"sales_order", "crm_deal", "hr_payroll"}


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


class FinanceCommandService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _ensure_branch_allowed(
        *,
        branch_id: UUID | None,
        allowed_branch_ids: set[UUID] | None,
        detail: str,
    ) -> None:
        if allowed_branch_ids is None or branch_id is None:
            return
        if branch_id not in allowed_branch_ids:
            raise HTTPException(status_code=404, detail=detail)

    @staticmethod
    def _ensure_generic_command_allowed(
        transaction: FinanceTransaction,
        *,
        command: str,
    ) -> None:
        source_module = (transaction.source_module or "").lower()
        if source_module in AUTOMATION_OWNED_SOURCES:
            labels = {
                "sales_order": "Sales Order Confirm Payment",
                "crm_deal": "CRM Deal Confirm Payment",
                "hr_payroll": "Payroll Pay command",
            }
            raise _conflict(
                f"{command} is blocked for {source_module}. "
                f"Use {labels[source_module]} to keep ERP records synchronized"
            )

    async def _default_cash_account(
        self,
        *,
        company_id: UUID,
    ) -> FinanceCashAccount:
        result = await self.db.execute(
            select(FinanceCashAccount)
            .where(
                FinanceCashAccount.company_id == company_id,
                FinanceCashAccount.is_active.is_(True),
            )
            .order_by(
                FinanceCashAccount.is_default.desc(),
                FinanceCashAccount.created_at.asc(),
                FinanceCashAccount.id.asc(),
            )
            .limit(1)
            .with_for_update()
        )
        account = result.scalar_one_or_none()
        if account is None:
            raise _conflict("No active cash account is configured")
        return account

    async def _transaction(
        self,
        *,
        transaction_id: UUID,
        company_id: UUID,
        allowed_branch_ids: set[UUID] | None = None,
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
        self._ensure_branch_allowed(
            branch_id=item.branch_id,
            allowed_branch_ids=allowed_branch_ids,
            detail="Transaction not found",
        )
        return item

    async def _invoice(
        self,
        *,
        invoice_id: UUID,
        company_id: UUID,
        allowed_branch_ids: set[UUID] | None = None,
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
        self._ensure_branch_allowed(
            branch_id=item.branch_id,
            allowed_branch_ids=allowed_branch_ids,
            detail="Invoice not found",
        )
        return item

    async def _journal(
        self,
        *,
        journal_id: UUID,
        company_id: UUID,
        allowed_branch_ids: set[UUID] | None = None,
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
        if item.transaction_id is not None:
            branch_id = await self.db.scalar(
                select(FinanceTransaction.branch_id).where(
                    FinanceTransaction.id == item.transaction_id,
                    FinanceTransaction.company_id == company_id,
                )
            )
            self._ensure_branch_allowed(
                branch_id=branch_id,
                allowed_branch_ids=allowed_branch_ids,
                detail="Journal not found",
            )
        return item


    async def _tax_record(
        self,
        *,
        tax_record_id: UUID,
        company_id: UUID,
        allowed_branch_ids: set[UUID] | None = None,
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
        branch_id = None
        if item.invoice_id is not None:
            branch_id = await self.db.scalar(
                select(FinanceInvoice.branch_id).where(
                    FinanceInvoice.id == item.invoice_id,
                    FinanceInvoice.company_id == company_id,
                )
            )
        elif item.transaction_id is not None:
            branch_id = await self.db.scalar(
                select(FinanceTransaction.branch_id).where(
                    FinanceTransaction.id == item.transaction_id,
                    FinanceTransaction.company_id == company_id,
                )
            )
        self._ensure_branch_allowed(
            branch_id=branch_id,
            allowed_branch_ids=allowed_branch_ids,
            detail="Tax record not found",
        )
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceTransaction:
        transaction = await self._transaction(
            transaction_id=transaction_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
        if transaction.status == TransactionStatus.POSTED:
            return transaction
        if transaction.status != TransactionStatus.DRAFT:
            raise _conflict("Only draft transactions can be posted")
        if Decimal(transaction.total_amount) <= ZERO:
            raise _conflict("Transaction total must be greater than zero")
        self._ensure_generic_command_allowed(
            transaction,
            command="Generic transaction posting",
        )
        if transaction.transaction_type == TransactionType.TAX_PAYMENT:
            raise _conflict("Use Pay Tax on an accrued tax record")
        if transaction.transaction_type == TransactionType.ADJUSTMENT:
            raise _conflict("Use Adjust Cash Balance for controlled adjustments")
        if transaction.transaction_type == TransactionType.TRANSFER:
            raise _conflict(
                "Cash transfer requires a dedicated source and destination workflow"
            )

        cash_account = None
        if transaction.transaction_type in {
            TransactionType.INCOME,
            TransactionType.EXPENSE,
            TransactionType.REFUND,
            TransactionType.TAX_PAYMENT,
        } and transaction.cash_account_id is None:
            raise _conflict("A cash account is required before posting this transaction")

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
        if cash_account is not None:
            await AccountingBridgeService(self.db).ensure_cash_transaction_journal(
                transaction=transaction,
                cash_account=cash_account,
            )
        await record_domain_event(
            self.db,
            company_id=company_id,
            aggregate_type="finance_transaction",
            aggregate_id=transaction.id,
            event_type="finance.transaction.posted",
            event_key=f"finance-transaction:{transaction.id}:posted",
            payload={
                "transaction_id": str(transaction.id),
                "transaction_type": transaction.transaction_type.value,
                "cashflow_activity": transaction.cashflow_activity.value,
                "total_amount": str(transaction.total_amount),
                "cash_account_id": (
                    str(transaction.cash_account_id)
                    if transaction.cash_account_id
                    else None
                ),
            },
        )
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceTransaction:
        transaction = await self._transaction(
            transaction_id=transaction_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
        if transaction.status == TransactionStatus.VOID:
            return transaction
        if transaction.status != TransactionStatus.POSTED:
            raise _conflict("Only posted transactions can be voided")
        self._ensure_generic_command_allowed(
            transaction,
            command="Generic transaction void",
        )

        if transaction.cash_account_id:
            cash_account = await self._cash_account(
                cash_account_id=transaction.cash_account_id,
                company_id=company_id,
            )
            cash_account.current_balance = (
                Decimal(cash_account.current_balance)
                - self._cash_delta(transaction)
            )

        await AccountingBridgeService(self.db).reverse_transaction_journals(
            transaction=transaction,
            reason="Transaction void",
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceTransaction:
        transaction = await self._transaction(
            transaction_id=transaction_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
        if transaction.status == TransactionStatus.CANCELLED:
            return transaction
        if transaction.status != TransactionStatus.DRAFT:
            raise _conflict("Only draft transactions can be cancelled")
        self._ensure_generic_command_allowed(
            transaction,
            command="Generic transaction cancellation",
        )
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceInvoice:
        invoice = await self._invoice(
            invoice_id=invoice_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
        if invoice.status == InvoiceStatus.SENT:
            return invoice
        if invoice.status != InvoiceStatus.DRAFT:
            raise _conflict("Only draft invoices can be sent")
        invoice.status = InvoiceStatus.SENT
        await ensure_invoice_tax_record(self.db, invoice=invoice)
        await AccountingBridgeService(self.db).ensure_invoice_issue_journal(
            invoice=invoice,
        )
        await record_domain_event(
            self.db,
            company_id=company_id,
            aggregate_type="finance_invoice",
            aggregate_id=invoice.id,
            event_type="finance.invoice.sent",
            event_key=f"invoice:{invoice.id}:sent",
            payload={
                "invoice_id": str(invoice.id),
                "invoice_no": invoice.invoice_no,
                "total_amount": str(invoice.total_amount),
            },
        )
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
        allowed_branch_ids: set[UUID] | None = None,
        user_id: UUID,
        payload: FinanceInvoicePaymentRequest,
    ) -> FinanceInvoice:
        invoice = await self._invoice(
            invoice_id=invoice_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
        if invoice.status == InvoiceStatus.CANCELLED:
            raise _conflict("Cancelled invoice cannot receive payment")
        if invoice.source_module in {"sales_order", "crm_deal"}:
            labels = {
                "sales_order": "Sales Order Confirm Payment",
                "crm_deal": "CRM Deal Confirm Payment",
            }
            raise _conflict(
                f"Invoice payment is owned by {invoice.source_module}. "
                f"Use {labels[invoice.source_module]}"
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

        cash_account = (
            await self._cash_account(
                cash_account_id=payload.cash_account_id,
                company_id=company_id,
            )
            if payload.cash_account_id
            else await self._default_cash_account(company_id=company_id)
        )
        cash_account.current_balance = Decimal(cash_account.current_balance) + amount

        # Every payment must affect a real cash account so cashflow, ledger,
        # invoice status, and account balance cannot diverge.
        payment_transaction = FinanceTransaction(
            company_id=company_id,
            branch_id=invoice.branch_id,
            cash_account_id=cash_account.id,
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
        await self.db.flush()

        invoice.paid_amount = paid + amount
        invoice.status = (
            InvoiceStatus.PAID
            if invoice.paid_amount >= total
            else InvoiceStatus.PARTIALLY_PAID
        )
        await ensure_invoice_tax_record(self.db, invoice=invoice)
        bridge = AccountingBridgeService(self.db)
        await bridge.ensure_invoice_issue_journal(invoice=invoice)
        await bridge.ensure_invoice_payment_journal(
            invoice=invoice,
            transaction=payment_transaction,
            cash_account=cash_account,
            amount=amount,
        )
        await record_domain_event(
            self.db,
            company_id=company_id,
            aggregate_type="finance_invoice",
            aggregate_id=invoice.id,
            event_type="finance.invoice.payment_recorded",
            event_key=f"invoice:{invoice.id}:payment:{payment_transaction.id}",
            payload={
                "invoice_id": str(invoice.id),
                "invoice_no": invoice.invoice_no,
                "transaction_id": str(payment_transaction.id),
                "payment_amount": str(amount),
                "paid_amount": str(invoice.paid_amount),
                "status": invoice.status.value,
            },
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceInvoice:
        invoice = await self._invoice(
            invoice_id=invoice_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
        if invoice.status == InvoiceStatus.CANCELLED:
            return invoice
        if invoice.source_module in {"sales_order", "crm_deal"}:
            raise _conflict(
                "Automatic invoice cancellation must use its source workflow"
            )
        if Decimal(invoice.paid_amount) > ZERO:
            raise _conflict("Paid or partially paid invoice cannot be cancelled")
        if invoice.status == InvoiceStatus.PAID:
            raise _conflict("Paid invoice cannot be cancelled")
        await AccountingBridgeService(self.db).reverse_invoice_issue_journal(
            invoice=invoice,
            reason=f"Invoice cancelled: {invoice.invoice_no}",
        )
        tax_result = await self.db.execute(
            select(FinanceTaxRecord).where(
                FinanceTaxRecord.company_id == company_id,
                FinanceTaxRecord.invoice_id == invoice.id,
                FinanceTaxRecord.status.in_(
                    [TaxRecordStatus.DRAFT, TaxRecordStatus.ACCRUED]
                ),
            )
        )
        for tax_record in tax_result.scalars().all():
            tax_record.status = TaxRecordStatus.CANCELLED
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceJournalEntry:
        journal = await self._journal(
            journal_id=journal_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceJournalEntry:
        journal = await self._journal(
            journal_id=journal_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
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
        allowed_branch_ids: set[UUID] | None = None,
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
        await self.db.flush()
        await AccountingBridgeService(self.db).ensure_cash_adjustment_journal(
            transaction=transaction,
            cash_account=cash_account,
            direction=payload.direction,
        )
        await record_domain_event(
            self.db,
            company_id=company_id,
            aggregate_type="finance_cash_account",
            aggregate_id=cash_account.id,
            event_type="finance.cash_account.adjusted",
            event_key=f"cash-account:{cash_account.id}:adjustment:{transaction.id}",
            payload={
                "cash_account_id": str(cash_account.id),
                "transaction_id": str(transaction.id),
                "direction": payload.direction,
                "amount": str(amount),
            },
        )
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
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
        allowed_branch_ids: set[UUID] | None = None,
        user_id: UUID,
        payload: FinanceTaxPaymentRequest,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
        )
        if record.status == TaxRecordStatus.PAID:
            return record
        if record.status != TaxRecordStatus.ACCRUED:
            raise _conflict("Only accrued tax records can be paid")
        amount = Decimal(record.tax_amount)
        if amount <= ZERO:
            raise _conflict("Tax amount must be greater than zero")

        cash_account = (
            await self._cash_account(
                cash_account_id=payload.cash_account_id,
                company_id=company_id,
            )
            if payload.cash_account_id
            else await self._default_cash_account(company_id=company_id)
        )
        cash_account.current_balance = Decimal(cash_account.current_balance) - amount

        branch_id = None
        if record.invoice_id is not None:
            branch_id = await self.db.scalar(
                select(FinanceInvoice.branch_id).where(
                    FinanceInvoice.id == record.invoice_id,
                    FinanceInvoice.company_id == company_id,
                )
            )
        elif record.transaction_id is not None:
            branch_id = await self.db.scalar(
                select(FinanceTransaction.branch_id).where(
                    FinanceTransaction.id == record.transaction_id,
                    FinanceTransaction.company_id == company_id,
                )
            )

        transaction = FinanceTransaction(
            company_id=company_id,
            branch_id=branch_id,
            cash_account_id=cash_account.id,
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
        await self.db.flush()
        await AccountingBridgeService(self.db).ensure_cash_transaction_journal(
            transaction=transaction,
            cash_account=cash_account,
        )
        record.paid_amount = amount
        record.paid_date = payload.payment_date or date.today()
        record.status = TaxRecordStatus.PAID
        await record_domain_event(
            self.db,
            company_id=company_id,
            aggregate_type="finance_tax_record",
            aggregate_id=record.id,
            event_type="finance.tax.paid",
            event_key=f"tax-record:{record.id}:paid",
            payload={
                "tax_record_id": str(record.id),
                "transaction_id": str(transaction.id),
                "tax_period": record.tax_period,
                "amount": str(amount),
            },
        )
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
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
        allowed_branch_ids: set[UUID] | None = None,
    ) -> FinanceTaxRecord:
        record = await self._tax_record(
            tax_record_id=tax_record_id,
            company_id=company_id,
            allowed_branch_ids=allowed_branch_ids,
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
