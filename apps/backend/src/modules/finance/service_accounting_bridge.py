from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.finance.model_finance import (
    FinanceAccount,
    FinanceAccountingPeriod,
    FinanceCashAccount,
    FinanceInvoice,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceTransaction,
    JournalStatus,
    TransactionType,
)
from src.modules.hr.model_hr import PayrollRun


ZERO = Decimal("0.00")


ACCOUNT_CODES = {
    "cash": "1120",
    "accounts_receivable": "1200",
    "inventory": "1300",
    "tax_payable": "2200",
    "payroll_payable": "2300",
    "equity": "3100",
    "revenue": "4100",
    "cogs": "5100",
    "salary_expense": "6100",
    "operating_expense": "6200",
}


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


class AccountingBridgeService:
    """Creates deterministic, balanced journals from ERP business events.

    The bridge is intentionally narrow. It never accepts arbitrary account IDs
    from an LLM or untrusted client. Business events map to controlled chart of
    account codes and every journal number is deterministic so retries remain
    idempotent.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _account(self, *, company_id: UUID, code: str) -> FinanceAccount:
        result = await self.db.execute(
            select(FinanceAccount).where(
                FinanceAccount.company_id == company_id,
                FinanceAccount.code == code,
                FinanceAccount.is_active.is_(True),
            )
        )
        account = result.scalar_one_or_none()
        if account is None:
            raise _conflict(
                f"Accounting account {code} is not configured for this company"
            )
        return account

    async def _period_id(self, *, company_id: UUID, journal_date: date) -> UUID | None:
        result = await self.db.execute(
            select(FinanceAccountingPeriod.id)
            .where(
                FinanceAccountingPeriod.company_id == company_id,
                FinanceAccountingPeriod.start_date <= journal_date,
                FinanceAccountingPeriod.end_date >= journal_date,
                FinanceAccountingPeriod.is_active.is_(True),
            )
            .order_by(FinanceAccountingPeriod.start_date.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _existing(
        self,
        *,
        company_id: UUID,
        journal_no: str,
    ) -> FinanceJournalEntry | None:
        result = await self.db.execute(
            select(FinanceJournalEntry).where(
                FinanceJournalEntry.company_id == company_id,
                FinanceJournalEntry.journal_no == journal_no,
            )
        )
        return result.scalar_one_or_none()

    async def _create_posted_journal(
        self,
        *,
        company_id: UUID,
        journal_no: str,
        journal_date: date,
        memo: str,
        transaction_id: UUID | None,
        created_by: UUID | None,
        lines: list[tuple[FinanceAccount, Decimal, Decimal, str]],
    ) -> FinanceJournalEntry:
        existing = await self._existing(
            company_id=company_id,
            journal_no=journal_no,
        )
        if existing is not None:
            return existing

        total_debit = sum((line[1] for line in lines), ZERO)
        total_credit = sum((line[2] for line in lines), ZERO)
        if total_debit <= ZERO or total_debit != total_credit:
            raise _conflict(
                f"Generated journal {journal_no} is not balanced"
            )

        journal = FinanceJournalEntry(
            company_id=company_id,
            period_id=await self._period_id(
                company_id=company_id,
                journal_date=journal_date,
            ),
            transaction_id=transaction_id,
            journal_no=journal_no,
            journal_date=journal_date,
            status=JournalStatus.POSTED,
            memo=memo,
            total_debit=total_debit,
            total_credit=total_credit,
            is_balanced=True,
            posted_at=datetime.now(timezone.utc).replace(tzinfo=None),
            created_by=created_by,
        )
        self.db.add(journal)
        await self.db.flush()

        for account, debit, credit, description in lines:
            self.db.add(
                FinanceJournalLine(
                    journal_entry_id=journal.id,
                    account_id=account.id,
                    description=description,
                    debit_amount=debit,
                    credit_amount=credit,
                )
            )

        await self.db.flush()
        return journal

    async def ensure_invoice_issue_journal(
        self,
        *,
        invoice: FinanceInvoice,
        transaction_id: UUID | None = None,
        created_by: UUID | None = None,
    ) -> FinanceJournalEntry:
        receivable = await self._account(
            company_id=invoice.company_id,
            code=ACCOUNT_CODES["accounts_receivable"],
        )
        revenue = await self._account(
            company_id=invoice.company_id,
            code=ACCOUNT_CODES["revenue"],
        )

        total = Decimal(invoice.total_amount)
        tax = Decimal(invoice.tax_amount or 0)
        subtotal = total - tax
        if subtotal < ZERO:
            raise _conflict("Invoice subtotal cannot be negative")

        lines: list[tuple[FinanceAccount, Decimal, Decimal, str]] = [
            (
                receivable,
                total,
                ZERO,
                f"Accounts receivable for {invoice.invoice_no}",
            ),
            (
                revenue,
                ZERO,
                subtotal,
                f"Revenue for {invoice.invoice_no}",
            ),
        ]
        if tax > ZERO:
            tax_payable = await self._account(
                company_id=invoice.company_id,
                code=ACCOUNT_CODES["tax_payable"],
            )
            lines.append(
                (
                    tax_payable,
                    ZERO,
                    tax,
                    f"Tax payable for {invoice.invoice_no}",
                )
            )

        return await self._create_posted_journal(
            company_id=invoice.company_id,
            journal_no=f"AUTO-INV-{invoice.invoice_no}",
            journal_date=invoice.invoice_date,
            memo=f"Invoice issued: {invoice.invoice_no}",
            transaction_id=transaction_id,
            created_by=created_by,
            lines=lines,
        )

    async def ensure_invoice_payment_journal(
        self,
        *,
        invoice: FinanceInvoice,
        transaction: FinanceTransaction,
        cash_account: FinanceCashAccount,
        amount: Decimal,
    ) -> FinanceJournalEntry:
        cash = await self._account_by_id(
            company_id=transaction.company_id,
            account_id=cash_account.account_id,
        )
        receivable = await self._account(
            company_id=transaction.company_id,
            code=ACCOUNT_CODES["accounts_receivable"],
        )
        return await self._create_posted_journal(
            company_id=transaction.company_id,
            journal_no=f"AUTO-PAY-{transaction.transaction_no}",
            journal_date=transaction.transaction_date,
            memo=f"Invoice payment: {invoice.invoice_no}",
            transaction_id=transaction.id,
            created_by=transaction.created_by,
            lines=[
                (cash, amount, ZERO, f"Cash received for {invoice.invoice_no}"),
                (
                    receivable,
                    ZERO,
                    amount,
                    f"Settle receivable for {invoice.invoice_no}",
                ),
            ],
        )

    async def ensure_cash_transaction_journal(
        self,
        *,
        transaction: FinanceTransaction,
        cash_account: FinanceCashAccount,
    ) -> FinanceJournalEntry:
        amount = Decimal(transaction.total_amount)
        cash = await self._account_by_id(
            company_id=transaction.company_id,
            account_id=cash_account.account_id,
        )

        if transaction.transaction_type in {
            TransactionType.INCOME,
            TransactionType.REFUND,
        }:
            counterpart = await self._account(
                company_id=transaction.company_id,
                code=ACCOUNT_CODES["revenue"],
            )
            lines = [
                (cash, amount, ZERO, transaction.description or "Cash income"),
                (
                    counterpart,
                    ZERO,
                    amount,
                    transaction.description or "Recognized revenue",
                ),
            ]
        elif transaction.transaction_type == TransactionType.TAX_PAYMENT:
            counterpart = await self._account(
                company_id=transaction.company_id,
                code=ACCOUNT_CODES["tax_payable"],
            )
            lines = [
                (
                    counterpart,
                    amount,
                    ZERO,
                    transaction.description or "Tax liability payment",
                ),
                (cash, ZERO, amount, transaction.description or "Cash paid"),
            ]
        else:
            counterpart_code = (
                ACCOUNT_CODES["salary_expense"]
                if transaction.source_module == "hr_payroll"
                else ACCOUNT_CODES["operating_expense"]
            )
            counterpart = await self._account(
                company_id=transaction.company_id,
                code=counterpart_code,
            )
            lines = [
                (
                    counterpart,
                    amount,
                    ZERO,
                    transaction.description or "Operating expense",
                ),
                (cash, ZERO, amount, transaction.description or "Cash paid"),
            ]

        return await self._create_posted_journal(
            company_id=transaction.company_id,
            journal_no=f"AUTO-TRX-{transaction.transaction_no}",
            journal_date=transaction.transaction_date,
            memo=transaction.description or transaction.transaction_no,
            transaction_id=transaction.id,
            created_by=transaction.created_by,
            lines=lines,
        )

    async def ensure_cash_adjustment_journal(
        self,
        *,
        transaction: FinanceTransaction,
        cash_account: FinanceCashAccount,
        direction: str,
    ) -> FinanceJournalEntry:
        amount = Decimal(transaction.total_amount)
        cash = await self._account_by_id(
            company_id=transaction.company_id,
            account_id=cash_account.account_id,
        )
        equity = await self._account(
            company_id=transaction.company_id,
            code=ACCOUNT_CODES["equity"],
        )
        if direction == "increase":
            lines = [
                (cash, amount, ZERO, transaction.description or "Cash adjustment"),
                (equity, ZERO, amount, "Equity balance correction"),
            ]
        else:
            lines = [
                (equity, amount, ZERO, "Equity balance correction"),
                (cash, ZERO, amount, transaction.description or "Cash adjustment"),
            ]
        return await self._create_posted_journal(
            company_id=transaction.company_id,
            journal_no=f"AUTO-ADJ-{transaction.transaction_no}",
            journal_date=transaction.transaction_date,
            memo=transaction.description or transaction.transaction_no,
            transaction_id=transaction.id,
            created_by=transaction.created_by,
            lines=lines,
        )

    async def ensure_sales_cogs_journal(
        self,
        *,
        company_id: UUID,
        order_no: str,
        order_date: date,
        transaction_id: UUID,
        created_by: UUID | None,
        amount: Decimal,
    ) -> FinanceJournalEntry | None:
        amount = Decimal(amount).quantize(Decimal("0.01"))
        if amount <= ZERO:
            return None
        cogs = await self._account(
            company_id=company_id,
            code=ACCOUNT_CODES["cogs"],
        )
        inventory = await self._account(
            company_id=company_id,
            code=ACCOUNT_CODES["inventory"],
        )
        return await self._create_posted_journal(
            company_id=company_id,
            journal_no=f"AUTO-COGS-{order_no}",
            journal_date=order_date,
            memo=f"Cost of goods sold: {order_no}",
            transaction_id=transaction_id,
            created_by=created_by,
            lines=[
                (cogs, amount, ZERO, f"COGS for {order_no}"),
                (inventory, ZERO, amount, f"Inventory released for {order_no}"),
            ],
        )

    async def ensure_payroll_accrual_journal(
        self,
        *,
        payroll_run: PayrollRun,
    ) -> FinanceJournalEntry:
        salary_expense = await self._account(
            company_id=payroll_run.company_id,
            code=ACCOUNT_CODES["salary_expense"],
        )
        payroll_payable = await self._account(
            company_id=payroll_run.company_id,
            code=ACCOUNT_CODES["payroll_payable"],
        )
        tax_payable = await self._account(
            company_id=payroll_run.company_id,
            code=ACCOUNT_CODES["tax_payable"],
        )

        gross_after_attendance = max(
            Decimal(payroll_run.total_gross)
            - Decimal(payroll_run.total_deductions),
            ZERO,
        )
        net = Decimal(payroll_run.total_net)
        tax = Decimal(payroll_run.total_tax)
        if gross_after_attendance != net + tax:
            # Preserve balance for legacy rows with rounding differences.
            gross_after_attendance = net + tax

        lines = [
            (
                salary_expense,
                gross_after_attendance,
                ZERO,
                f"Payroll expense {payroll_run.payroll_no}",
            ),
            (
                payroll_payable,
                ZERO,
                net,
                f"Payroll payable {payroll_run.payroll_no}",
            ),
        ]
        if tax > ZERO:
            lines.append(
                (
                    tax_payable,
                    ZERO,
                    tax,
                    f"Payroll withholding {payroll_run.payroll_no}",
                )
            )

        return await self._create_posted_journal(
            company_id=payroll_run.company_id,
            journal_no=f"AUTO-PAYROLL-ACCRUAL-{payroll_run.payroll_no}",
            journal_date=payroll_run.period_end,
            memo=f"Payroll accrual {payroll_run.payroll_no}",
            transaction_id=payroll_run.finance_transaction_id,
            created_by=payroll_run.created_by_id,
            lines=lines,
        )

    async def ensure_payroll_payment_journal(
        self,
        *,
        payroll_run: PayrollRun,
        transaction: FinanceTransaction,
        cash_account: FinanceCashAccount,
    ) -> FinanceJournalEntry:
        cash = await self._account_by_id(
            company_id=payroll_run.company_id,
            account_id=cash_account.account_id,
        )
        payroll_payable = await self._account(
            company_id=payroll_run.company_id,
            code=ACCOUNT_CODES["payroll_payable"],
        )
        amount = Decimal(payroll_run.total_net)
        return await self._create_posted_journal(
            company_id=payroll_run.company_id,
            journal_no=f"AUTO-PAYROLL-PAY-{payroll_run.payroll_no}",
            journal_date=transaction.transaction_date,
            memo=f"Payroll payment {payroll_run.payroll_no}",
            transaction_id=transaction.id,
            created_by=transaction.created_by,
            lines=[
                (
                    payroll_payable,
                    amount,
                    ZERO,
                    f"Settle payroll payable {payroll_run.payroll_no}",
                ),
                (
                    cash,
                    ZERO,
                    amount,
                    f"Cash payment {payroll_run.payroll_no}",
                ),
            ],
        )

    async def reverse_transaction_journals(
        self,
        *,
        transaction: FinanceTransaction,
        reason: str,
    ) -> None:
        result = await self.db.execute(
            select(FinanceJournalEntry).where(
                FinanceJournalEntry.company_id == transaction.company_id,
                FinanceJournalEntry.transaction_id == transaction.id,
                FinanceJournalEntry.status == JournalStatus.POSTED,
            )
        )
        journals = list(result.scalars().all())
        for journal in journals:
            reversal_no = f"AUTO-REV-{journal.journal_no}"
            if await self._existing(
                company_id=transaction.company_id,
                journal_no=reversal_no,
            ):
                continue
            lines_result = await self.db.execute(
                select(FinanceJournalLine).where(
                    FinanceJournalLine.journal_entry_id == journal.id
                )
            )
            original_lines = list(lines_result.scalars().all())
            lines: list[tuple[FinanceAccount, Decimal, Decimal, str]] = []
            for original in original_lines:
                account = await self._account_by_id(
                    company_id=transaction.company_id,
                    account_id=original.account_id,
                )
                lines.append(
                    (
                        account,
                        Decimal(original.credit_amount),
                        Decimal(original.debit_amount),
                        f"Reversal: {original.description or journal.journal_no}",
                    )
                )
            await self._create_posted_journal(
                company_id=transaction.company_id,
                journal_no=reversal_no,
                journal_date=date.today(),
                memo=f"{reason}: {journal.journal_no}",
                transaction_id=transaction.id,
                created_by=transaction.created_by,
                lines=lines,
            )

    async def reverse_invoice_issue_journal(
        self,
        *,
        invoice: FinanceInvoice,
        reason: str,
    ) -> None:
        original_no = f"AUTO-INV-{invoice.invoice_no}"
        original = await self._existing(
            company_id=invoice.company_id,
            journal_no=original_no,
        )
        if original is None:
            return
        reversal_no = f"AUTO-REV-{original_no}"
        if await self._existing(
            company_id=invoice.company_id,
            journal_no=reversal_no,
        ):
            return
        lines_result = await self.db.execute(
            select(FinanceJournalLine).where(
                FinanceJournalLine.journal_entry_id == original.id
            )
        )
        lines: list[tuple[FinanceAccount, Decimal, Decimal, str]] = []
        for original_line in lines_result.scalars().all():
            account = await self._account_by_id(
                company_id=invoice.company_id,
                account_id=original_line.account_id,
            )
            lines.append(
                (
                    account,
                    Decimal(original_line.credit_amount),
                    Decimal(original_line.debit_amount),
                    f"Invoice cancellation: {invoice.invoice_no}",
                )
            )
        await self._create_posted_journal(
            company_id=invoice.company_id,
            journal_no=reversal_no,
            journal_date=date.today(),
            memo=reason,
            transaction_id=original.transaction_id,
            created_by=original.created_by,
            lines=lines,
        )

    async def _account_by_id(
        self,
        *,
        company_id: UUID,
        account_id: UUID,
    ) -> FinanceAccount:
        result = await self.db.execute(
            select(FinanceAccount).where(
                FinanceAccount.id == account_id,
                FinanceAccount.company_id == company_id,
            )
        )
        account = result.scalar_one_or_none()
        if account is None:
            raise _conflict("Journal account no longer exists")
        return account
