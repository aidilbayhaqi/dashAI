from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.time import utc_now_naive
from src.service.base_domain_service import BaseDomainService
from src.service.domain_integrity import commit_or_raise, flush_or_raise
from src.modules.finance.model_finance import (
    AccountType,
    BudgetStatus,
    CashflowActivity,
    FinanceAccountingPeriod,
    FinanceAccount,
    FinanceBalanceSheetSnapshot,
    FinanceBudget,
    FinanceBudgetLine,
    FinanceCashAccount,
    FinanceCashflowSnapshot,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceMarginSnapshot,
    FinanceProfitLossSnapshot,
    FinanceTaxRate,
    FinanceTaxRecord,
    FinanceTransaction,
    FinanceTransactionLine,
    JournalStatus,
    PeriodStatus,
    TaxRecordStatus,
    TransactionStatus,
    TransactionType,
)

from src.realtime.events import publish_realtime_event_safe

def to_decimal(value) -> Decimal:
    return Decimal(str(value or 0))


async def _persist_finance_snapshot(
    *,
    db: AsyncSession,
    snapshot,
    event_type: str,
    event_payload_factory,
    company_id: UUID,
    commit: bool,
    publish_event: bool,
):
    """Persist a report snapshot with caller-controlled transaction boundary."""

    if publish_event and not commit:
        raise ValueError(
            "publish_event requires commit=True to avoid pre-commit events"
        )

    db.add(snapshot)
    if commit:
        await commit_or_raise(db)
    else:
        await flush_or_raise(db)

    if publish_event:
        await publish_realtime_event_safe(
            event_type,
            event_payload_factory(),
            company_id=company_id,
            module="finance",
        )
    return snapshot


class FinanceAccountingPeriodService(BaseDomainService):
    model_class = FinanceAccountingPeriod

    async def get_open_periods(self, company_id: UUID):
        query = (
            select(FinanceAccountingPeriod)
            .where(
                FinanceAccountingPeriod.company_id == company_id,
                FinanceAccountingPeriod.status == PeriodStatus.OPEN,
            )
            .order_by(
                FinanceAccountingPeriod.fiscal_year.asc(),
                FinanceAccountingPeriod.period_number.asc(),
            )
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def find_period_by_date(self, company_id: UUID, target_date: date):
        query = select(FinanceAccountingPeriod).where(
            FinanceAccountingPeriod.company_id == company_id,
            FinanceAccountingPeriod.start_date <= target_date,
            FinanceAccountingPeriod.end_date >= target_date,
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def close_period(self, period_id: UUID):
        period = await self.get_by_id(period_id)

        if period is None:
            return None

        period.status = PeriodStatus.CLOSED

        await self.db.commit()
        await self.db.refresh(period)

        return period

    async def lock_period(self, period_id: UUID):
        period = await self.get_by_id(period_id)

        if period is None:
            return None

        period.status = PeriodStatus.LOCKED

        await self.db.commit()
        await self.db.refresh(period)

        return period


class FinanceAccountService(BaseDomainService):
    model_class = FinanceAccount

    async def get_by_code(self, company_id: UUID, code: str):
        query = select(FinanceAccount).where(
            FinanceAccount.company_id == company_id,
            FinanceAccount.code == code,
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_type(self, company_id: UUID, account_type: AccountType):
        query = (
            select(FinanceAccount)
            .where(
                FinanceAccount.company_id == company_id,
                FinanceAccount.account_type == account_type,
                FinanceAccount.is_active.is_(True),
            )
            .order_by(FinanceAccount.code.asc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_accounts(
        self,
        *,
        company_id: UUID,
        keyword: str | None = None,
        account_type: AccountType | None = None,
        page: int = 1,
        page_size: int = 50,
    ):
        page = max(page, 1)
        page_size = min(max(page_size, 1), 200)

        query = select(FinanceAccount).where(
            FinanceAccount.company_id == company_id
        )

        if keyword:
            query = query.where(
                or_(
                    FinanceAccount.code.ilike(f"%{keyword}%"),
                    FinanceAccount.name.ilike(f"%{keyword}%"),
                )
            )

        if account_type:
            query = query.where(FinanceAccount.account_type == account_type)

        query = (
            query.order_by(FinanceAccount.code.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())


class FinanceTaxRateService(BaseDomainService):
    model_class = FinanceTaxRate

    async def get_active_tax_rates(
        self,
        *,
        company_id: UUID,
        target_date: date | None = None,
    ):
        if target_date is None:
            target_date = date.today()

        query = select(FinanceTaxRate).where(
            FinanceTaxRate.company_id == company_id,
            FinanceTaxRate.is_active.is_(True),
            FinanceTaxRate.effective_from <= target_date,
            or_(
                FinanceTaxRate.effective_to.is_(None),
                FinanceTaxRate.effective_to >= target_date,
            ),
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    def calculate_tax_amount(
        self,
        *,
        taxable_amount: Decimal,
        rate_percent: Decimal,
    ) -> Decimal:
        return (taxable_amount * rate_percent / Decimal("100")).quantize(
            Decimal("0.01")
        )


class FinanceCashAccountService(BaseDomainService):
    model_class = FinanceCashAccount

    async def get_active_cash_accounts(self, company_id: UUID):
        query = (
            select(FinanceCashAccount)
            .where(
                FinanceCashAccount.company_id == company_id,
                FinanceCashAccount.is_active.is_(True),
            )
            .order_by(FinanceCashAccount.name.asc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def increase_balance(self, cash_account_id: UUID, amount: Decimal):
        cash_account = await self.get_by_id(cash_account_id)

        if cash_account is None:
            return None

        cash_account.current_balance += amount

        await self.db.commit()
        await self.db.refresh(cash_account)

        return cash_account

    async def decrease_balance(self, cash_account_id: UUID, amount: Decimal):
        cash_account = await self.get_by_id(cash_account_id)

        if cash_account is None:
            return None

        cash_account.current_balance -= amount

        await self.db.commit()
        await self.db.refresh(cash_account)

        return cash_account


class FinanceTransactionService(BaseDomainService):
    model_class = FinanceTransaction

    async def search_transactions(
        self,
        *,
        company_id: UUID,
        start_date: date | None = None,
        end_date: date | None = None,
        status: TransactionStatus | None = None,
        transaction_type: TransactionType | None = None,
        keyword: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ):
        page = max(page, 1)
        page_size = min(max(page_size, 1), 200)

        query = select(FinanceTransaction).where(
            FinanceTransaction.company_id == company_id
        )

        if start_date:
            query = query.where(FinanceTransaction.transaction_date >= start_date)

        if end_date:
            query = query.where(FinanceTransaction.transaction_date <= end_date)

        if status:
            query = query.where(FinanceTransaction.status == status)

        if transaction_type:
            query = query.where(FinanceTransaction.transaction_type == transaction_type)

        if keyword:
            query = query.where(
                or_(
                    FinanceTransaction.transaction_no.ilike(f"%{keyword}%"),
                    FinanceTransaction.reference_no.ilike(f"%{keyword}%"),
                    FinanceTransaction.counterparty_name.ilike(f"%{keyword}%"),
                )
            )

        query = (
            query.order_by(desc(FinanceTransaction.transaction_date))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def post_transaction(self, transaction_id: UUID):
        """Compatibility facade for callers that have not migrated yet.

        All state transitions delegate to FinanceCommandService so balance
        mutation, row locking, tenant scoping, and realtime events stay atomic.
        """
        transaction = await self.get_by_id(transaction_id)
        if transaction is None:
            return None
        from src.modules.finance.service_finance_commands import (
            FinanceCommandService,
        )

        return await FinanceCommandService(self.db).post_transaction(
            transaction_id=transaction.id,
            company_id=transaction.company_id,
        )

    async def void_transaction(self, transaction_id: UUID):
        transaction = await self.get_by_id(transaction_id)
        if transaction is None:
            return None
        from src.modules.finance.service_finance_commands import (
            FinanceCommandService,
        )

        return await FinanceCommandService(self.db).void_transaction(
            transaction_id=transaction.id,
            company_id=transaction.company_id,
        )

    async def get_total_by_type(
        self,
        *,
        company_id: UUID,
        transaction_type: TransactionType,
        start_date: date,
        end_date: date,
    ) -> Decimal:
        query = select(
            func.coalesce(func.sum(FinanceTransaction.total_amount), 0)
        ).where(
            FinanceTransaction.company_id == company_id,
            FinanceTransaction.transaction_type == transaction_type,
            FinanceTransaction.status == TransactionStatus.POSTED,
            FinanceTransaction.transaction_date >= start_date,
            FinanceTransaction.transaction_date <= end_date,
        )

        result = await self.db.execute(query)
        return to_decimal(result.scalar_one())


class FinanceTransactionLineService(BaseDomainService):
    model_class = FinanceTransactionLine

    async def get_lines_by_transaction(self, transaction_id: UUID):
        query = select(FinanceTransactionLine).where(
            FinanceTransactionLine.transaction_id == transaction_id
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    def calculate_line_total(
        self,
        *,
        quantity: Decimal,
        unit_price: Decimal,
        tax_amount: Decimal = Decimal("0.00"),
    ) -> dict:
        amount = quantity * unit_price
        total_amount = amount + tax_amount

        return {
            "amount": amount.quantize(Decimal("0.01")),
            "tax_amount": tax_amount.quantize(Decimal("0.01")),
            "total_amount": total_amount.quantize(Decimal("0.01")),
        }


class FinanceJournalEntryService(BaseDomainService):
    model_class = FinanceJournalEntry

    async def get_journals_by_period(
        self,
        *,
        company_id: UUID,
        period_id: UUID,
    ):
        query = (
            select(FinanceJournalEntry)
            .where(
                FinanceJournalEntry.company_id == company_id,
                FinanceJournalEntry.period_id == period_id,
            )
            .order_by(FinanceJournalEntry.journal_date.desc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def validate_balance(self, journal_entry_id: UUID) -> bool:
        query = select(
            func.coalesce(func.sum(FinanceJournalLine.debit_amount), 0),
            func.coalesce(func.sum(FinanceJournalLine.credit_amount), 0),
        ).where(FinanceJournalLine.journal_entry_id == journal_entry_id)

        result = await self.db.execute(query)
        total_debit, total_credit = result.one()

        return to_decimal(total_debit) == to_decimal(total_credit)

    async def update_journal_totals(self, journal_entry_id: UUID):
        journal = await self.get_by_id(journal_entry_id)

        if journal is None:
            return None

        query = select(
            func.coalesce(func.sum(FinanceJournalLine.debit_amount), 0),
            func.coalesce(func.sum(FinanceJournalLine.credit_amount), 0),
        ).where(FinanceJournalLine.journal_entry_id == journal_entry_id)

        result = await self.db.execute(query)
        total_debit, total_credit = result.one()

        journal.total_debit = to_decimal(total_debit)
        journal.total_credit = to_decimal(total_credit)
        journal.is_balanced = journal.total_debit == journal.total_credit

        await self.db.commit()
        await self.db.refresh(journal)

        return journal

    async def post_journal(self, journal_entry_id: UUID):
        journal = await self.update_journal_totals(journal_entry_id)

        if journal is None:
            return None

        if not journal.is_balanced:
            raise ValueError("Journal is not balanced. Debit and credit must be equal.")

        journal.status = JournalStatus.POSTED
        journal.posted_at = utc_now_naive()

        await self.db.commit()
        await self.db.refresh(journal)

        return journal

    async def reverse_journal(self, journal_entry_id: UUID):
        journal = await self.get_by_id(journal_entry_id)

        if journal is None:
            return None

        journal.status = JournalStatus.REVERSED

        await self.db.commit()
        await self.db.refresh(journal)

        return journal


class FinanceJournalLineService(BaseDomainService):
    model_class = FinanceJournalLine

    async def get_lines_by_journal(self, journal_entry_id: UUID):
        query = select(FinanceJournalLine).where(
            FinanceJournalLine.journal_entry_id == journal_entry_id
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_account_balance(
        self,
        *,
        account_id: UUID,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        query = (
            select(
                func.coalesce(func.sum(FinanceJournalLine.debit_amount), 0),
                func.coalesce(func.sum(FinanceJournalLine.credit_amount), 0),
            )
            .join(
                FinanceJournalEntry,
                FinanceJournalEntry.id == FinanceJournalLine.journal_entry_id,
            )
            .where(
                FinanceJournalLine.account_id == account_id,
                FinanceJournalEntry.status == JournalStatus.POSTED,
            )
        )

        if start_date:
            query = query.where(FinanceJournalEntry.journal_date >= start_date)

        if end_date:
            query = query.where(FinanceJournalEntry.journal_date <= end_date)

        result = await self.db.execute(query)
        total_debit, total_credit = result.one()

        total_debit = to_decimal(total_debit)
        total_credit = to_decimal(total_credit)

        return {
            "account_id": account_id,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "net_balance": total_debit - total_credit,
        }


class FinanceTaxRecordService(BaseDomainService):
    model_class = FinanceTaxRecord

    async def get_tax_summary(
        self,
        *,
        company_id: UUID,
        tax_period: str,
    ):
        query = (
            select(
                FinanceTaxRecord.tax_type,
                func.coalesce(func.sum(FinanceTaxRecord.taxable_amount), 0),
                func.coalesce(func.sum(FinanceTaxRecord.tax_amount), 0),
                func.coalesce(func.sum(FinanceTaxRecord.paid_amount), 0),
            )
            .where(
                FinanceTaxRecord.company_id == company_id,
                FinanceTaxRecord.tax_period == tax_period,
            )
            .group_by(FinanceTaxRecord.tax_type)
        )

        result = await self.db.execute(query)

        return [
            {
                "tax_type": row[0],
                "taxable_amount": to_decimal(row[1]),
                "tax_amount": to_decimal(row[2]),
                "paid_amount": to_decimal(row[3]),
                "remaining_amount": to_decimal(row[2]) - to_decimal(row[3]),
            }
            for row in result.all()
        ]

    async def mark_as_paid(
        self,
        *,
        tax_record_id: UUID,
        paid_amount: Decimal,
        paid_date: date,
    ):
        tax_record = await self.get_by_id(tax_record_id)

        if tax_record is None:
            return None

        tax_record.paid_amount = paid_amount
        tax_record.paid_date = paid_date
        tax_record.status = TaxRecordStatus.PAID

        await self.db.commit()
        await self.db.refresh(tax_record)

        return tax_record

    async def mark_as_reported(
        self,
        *,
        tax_record_id: UUID,
        reported_date: date,
    ):
        tax_record = await self.get_by_id(tax_record_id)

        if tax_record is None:
            return None

        tax_record.reported_date = reported_date
        tax_record.status = TaxRecordStatus.REPORTED

        await self.db.commit()
        await self.db.refresh(tax_record)

        return tax_record


class FinanceBudgetService(BaseDomainService):
    model_class = FinanceBudget

    async def get_active_budget(
        self,
        *,
        company_id: UUID,
        fiscal_year: int,
    ):
        query = select(FinanceBudget).where(
            FinanceBudget.company_id == company_id,
            FinanceBudget.fiscal_year == fiscal_year,
            FinanceBudget.status == BudgetStatus.ACTIVE,
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def recalculate_total_budget(self, budget_id: UUID):
        query = select(
            func.coalesce(func.sum(FinanceBudgetLine.budget_amount), 0)
        ).where(FinanceBudgetLine.budget_id == budget_id)

        result = await self.db.execute(query)
        total_budget = to_decimal(result.scalar_one())

        budget = await self.get_by_id(budget_id)

        if budget is None:
            return None

        budget.total_budget_amount = total_budget

        await self.db.commit()
        await self.db.refresh(budget)

        return budget


class FinanceBudgetLineService(BaseDomainService):
    model_class = FinanceBudgetLine

    async def get_lines_by_budget(self, budget_id: UUID):
        query = select(FinanceBudgetLine).where(
            FinanceBudgetLine.budget_id == budget_id
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def calculate_variance(
        self,
        *,
        budget_line_id: UUID,
        actual_amount: Decimal,
    ):
        budget_line = await self.get_by_id(budget_line_id)

        if budget_line is None:
            return None

        budget_line.actual_amount = actual_amount
        budget_line.variance_amount = budget_line.budget_amount - actual_amount

        if budget_line.budget_amount != 0:
            budget_line.variance_percent = (
                budget_line.variance_amount / budget_line.budget_amount * 100
            ).quantize(Decimal("0.0001"))
        else:
            budget_line.variance_percent = Decimal("0.0000")

        await self.db.commit()
        await self.db.refresh(budget_line)

        return budget_line


class FinanceReportCalculationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def sum_account_type(
        self,
        *,
        company_id: UUID,
        account_type: AccountType,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> Decimal:
        query = (
            select(
                func.coalesce(func.sum(FinanceJournalLine.debit_amount), 0),
                func.coalesce(func.sum(FinanceJournalLine.credit_amount), 0),
            )
            .join(
                FinanceJournalEntry,
                FinanceJournalEntry.id == FinanceJournalLine.journal_entry_id,
            )
            .join(
                FinanceAccount,
                FinanceAccount.id == FinanceJournalLine.account_id,
            )
            .where(
                FinanceJournalEntry.company_id == company_id,
                FinanceJournalEntry.status == JournalStatus.POSTED,
                FinanceAccount.account_type == account_type,
            )
        )

        if start_date:
            query = query.where(FinanceJournalEntry.journal_date >= start_date)

        if end_date:
            query = query.where(FinanceJournalEntry.journal_date <= end_date)

        result = await self.db.execute(query)
        total_debit, total_credit = result.one()

        total_debit = to_decimal(total_debit)
        total_credit = to_decimal(total_credit)

        if account_type in [
            AccountType.ASSET,
            AccountType.EXPENSE,
            AccountType.COST_OF_GOODS_SOLD,
            AccountType.TAX,
        ]:
            return total_debit - total_credit

        return total_credit - total_debit


class FinanceProfitLossSnapshotService(BaseDomainService):
    model_class = FinanceProfitLossSnapshot

    async def generate_from_journals(
        self,
        *,
        company_id: UUID,
        period_id: UUID | None,
        start_date: date,
        end_date: date,
        report_date: date,
        commit: bool = True,
        publish_event: bool = True,
    ):
        report_service = FinanceReportCalculationService(self.db)

        total_revenue = await report_service.sum_account_type(
            company_id=company_id,
            account_type=AccountType.REVENUE,
            start_date=start_date,
            end_date=end_date,
        )

        total_cogs = await report_service.sum_account_type(
            company_id=company_id,
            account_type=AccountType.COST_OF_GOODS_SOLD,
            start_date=start_date,
            end_date=end_date,
        )

        operating_expense = await report_service.sum_account_type(
            company_id=company_id,
            account_type=AccountType.EXPENSE,
            start_date=start_date,
            end_date=end_date,
        )

        tax_expense = await report_service.sum_account_type(
            company_id=company_id,
            account_type=AccountType.TAX,
            start_date=start_date,
            end_date=end_date,
        )

        gross_profit = total_revenue - total_cogs
        operating_profit = gross_profit - operating_expense
        net_profit = operating_profit - tax_expense

        gross_margin_percent = (
            gross_profit / total_revenue * 100
        ).quantize(Decimal("0.0001")) if total_revenue != 0 else Decimal("0.0000")

        net_margin_percent = (
            net_profit / total_revenue * 100
        ).quantize(Decimal("0.0001")) if total_revenue != 0 else Decimal("0.0000")

        snapshot = FinanceProfitLossSnapshot(
            company_id=company_id,
            period_id=period_id,
            report_date=report_date,
            total_revenue=total_revenue,
            total_cogs=total_cogs,
            gross_profit=gross_profit,
            operating_expense=operating_expense,
            operating_profit=operating_profit,
            tax_expense=tax_expense,
            net_profit=net_profit,
            gross_margin_percent=gross_margin_percent,
            net_margin_percent=net_margin_percent,
        )

        return await _persist_finance_snapshot(
            db=self.db,
            snapshot=snapshot,
            event_type="finance.profit_loss.generated",
            event_payload_factory=lambda: {
                "snapshot_id": str(snapshot.id),
                "period_id": str(snapshot.period_id) if snapshot.period_id else None,
                "report_date": snapshot.report_date.isoformat(),
            },
            company_id=company_id,
            commit=commit,
            publish_event=publish_event,
        )


class FinanceCashflowSnapshotService(BaseDomainService):
    model_class = FinanceCashflowSnapshot

    async def generate_from_transactions(
        self,
        *,
        company_id: UUID,
        period_id: UUID | None,
        start_date: date,
        end_date: date,
        report_date: date,
        beginning_cash_balance: Decimal = Decimal("0.00"),
        commit: bool = True,
        publish_event: bool = True,
    ):
        async def sum_cash(activity: CashflowActivity, types: list[TransactionType]):
            query = select(
                func.coalesce(func.sum(FinanceTransaction.total_amount), 0)
            ).where(
                FinanceTransaction.company_id == company_id,
                FinanceTransaction.status == TransactionStatus.POSTED,
                FinanceTransaction.cashflow_activity == activity,
                FinanceTransaction.transaction_type.in_(types),
                FinanceTransaction.transaction_date >= start_date,
                FinanceTransaction.transaction_date <= end_date,
            )

            result = await self.db.execute(query)
            return to_decimal(result.scalar_one())

        cash_in_types = [TransactionType.INCOME, TransactionType.REFUND]
        cash_out_types = [TransactionType.EXPENSE, TransactionType.TAX_PAYMENT]

        operating_cash_in = await sum_cash(CashflowActivity.OPERATING, cash_in_types)
        operating_cash_out = await sum_cash(CashflowActivity.OPERATING, cash_out_types)

        investing_cash_in = await sum_cash(CashflowActivity.INVESTING, cash_in_types)
        investing_cash_out = await sum_cash(CashflowActivity.INVESTING, cash_out_types)

        financing_cash_in = await sum_cash(CashflowActivity.FINANCING, cash_in_types)
        financing_cash_out = await sum_cash(CashflowActivity.FINANCING, cash_out_types)

        net_cashflow = (
            operating_cash_in
            - operating_cash_out
            + investing_cash_in
            - investing_cash_out
            + financing_cash_in
            - financing_cash_out
        )

        ending_cash_balance = beginning_cash_balance + net_cashflow

        snapshot = FinanceCashflowSnapshot(
            company_id=company_id,
            period_id=period_id,
            report_date=report_date,
            beginning_cash_balance=beginning_cash_balance,
            operating_cash_in=operating_cash_in,
            operating_cash_out=operating_cash_out,
            investing_cash_in=investing_cash_in,
            investing_cash_out=investing_cash_out,
            financing_cash_in=financing_cash_in,
            financing_cash_out=financing_cash_out,
            net_cashflow=net_cashflow,
            ending_cash_balance=ending_cash_balance,
        )

        return await _persist_finance_snapshot(
            db=self.db,
            snapshot=snapshot,
            event_type="finance.cashflow.generated",
            event_payload_factory=lambda: {
                "snapshot_id": str(snapshot.id),
                "period_id": str(snapshot.period_id) if snapshot.period_id else None,
                "report_date": snapshot.report_date.isoformat(),
            },
            company_id=company_id,
            commit=commit,
            publish_event=publish_event,
        )


class FinanceMarginSnapshotService(BaseDomainService):
    model_class = FinanceMarginSnapshot

    async def calculate_margin(
        self,
        *,
        company_id: UUID,
        period_id: UUID | None,
        report_date: date,
        object_type: str,
        object_id: UUID | None,
        object_name: str | None,
        revenue_amount: Decimal,
        cogs_amount: Decimal,
    ):
        gross_profit = revenue_amount - cogs_amount

        gross_margin_percent = (
            gross_profit / revenue_amount * 100
        ).quantize(Decimal("0.0001")) if revenue_amount != 0 else Decimal("0.0000")

        snapshot = FinanceMarginSnapshot(
            company_id=company_id,
            period_id=period_id,
            report_date=report_date,
            object_type=object_type,
            object_id=object_id,
            object_name=object_name,
            revenue_amount=revenue_amount,
            cogs_amount=cogs_amount,
            gross_profit=gross_profit,
            gross_margin_percent=gross_margin_percent,
        )

        self.db.add(snapshot)
        await commit_or_raise(self.db)
        await self.db.refresh(snapshot)
        await publish_realtime_event_safe(
            "finance.margin.generated",
            {"snapshot_id": str(snapshot.id), "report_date": snapshot.report_date.isoformat()},
            company_id=company_id,
            module="finance",
        )

        return snapshot


class FinanceBalanceSheetSnapshotService(BaseDomainService):
    model_class = FinanceBalanceSheetSnapshot

    async def generate_from_journals(
        self,
        *,
        company_id: UUID,
        period_id: UUID | None,
        report_date: date,
        commit: bool = True,
        publish_event: bool = True,
    ):
        report_service = FinanceReportCalculationService(self.db)

        total_assets = await report_service.sum_account_type(
            company_id=company_id,
            account_type=AccountType.ASSET,
            end_date=report_date,
        )

        total_liabilities = await report_service.sum_account_type(
            company_id=company_id,
            account_type=AccountType.LIABILITY,
            end_date=report_date,
        )

        total_equity = await report_service.sum_account_type(
            company_id=company_id,
            account_type=AccountType.EQUITY,
            end_date=report_date,
        )

        is_balanced = total_assets == (total_liabilities + total_equity)

        snapshot = FinanceBalanceSheetSnapshot(
            company_id=company_id,
            period_id=period_id,
            report_date=report_date,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            total_equity=total_equity,
            is_balanced=is_balanced,
        )

        return await _persist_finance_snapshot(
            db=self.db,
            snapshot=snapshot,
            event_type="finance.balance_sheet.generated",
            event_payload_factory=lambda: {
                "snapshot_id": str(snapshot.id),
                "report_date": snapshot.report_date.isoformat(),
            },
            company_id=company_id,
            commit=commit,
            publish_event=publish_event,
        )