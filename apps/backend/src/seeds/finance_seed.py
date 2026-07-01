from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.finance.model_finance import (
    CashflowActivity,
    FinanceAccount,
    FinanceAccountingPeriod,
    FinanceCashAccount,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceTaxRate,
    FinanceTransaction,
    FinanceTransactionLine,
    JournalStatus,
    PeriodStatus,
    TaxType,
    TransactionStatus,
    TransactionType,
)
from src.seeds.context import CompanySeedContext
from src.seeds.data import FINANCE_ACCOUNTS
from src.seeds.utils import D, add_if_missing, add_many_if_missing, sid


async def seed_finance(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
    system_user_ids: dict[str, object],
):
    for ctx in contexts.values():
        periods = []

        for month in range(1, 13):
            start = date(2026, month, 1)

            if month == 12:
                end = date(2026, 12, 31)
            else:
                end = date(2026, month + 1, 1) - timedelta(days=1)

            periods.append(
                FinanceAccountingPeriod(
                    id=ctx.period_ids[month],
                    company_id=ctx.company_id,
                    fiscal_year=2026,
                    period_number=month,
                    name=f"2026-{month:02d}",
                    start_date=start,
                    end_date=end,
                    status=PeriodStatus.OPEN,
                    is_active=True,
                )
            )

        await add_many_if_missing(db, periods)

        accounts = []

        for code, name, account_type, normal_balance, parent_code, is_cash, is_bank, is_tax in FINANCE_ACCOUNTS:
            accounts.append(
                FinanceAccount(
                    id=ctx.account_ids[code],
                    company_id=ctx.company_id,
                    parent_account_id=ctx.account_ids[parent_code] if parent_code else None,
                    code=code,
                    name=name,
                    account_type=account_type,
                    normal_balance=normal_balance,
                    description=f"Akun {name}",
                    is_cash_account=is_cash,
                    is_bank_account=is_bank,
                    is_tax_account=is_tax,
                    is_active=True,
                )
            )

        await add_many_if_missing(db, accounts)
        await db.flush()

        await add_if_missing(
            db,
            FinanceTaxRate(
                id=ctx.tax_rate_ids["ppn"],
                company_id=ctx.company_id,
                name="PPN Sample",
                tax_type=TaxType.PPN,
                rate_percent=D("11.0000"),
                effective_from=date(2026, 1, 1),
                effective_to=None,
                is_active=True,
            ),
        )

        cash_accounts = [
            FinanceCashAccount(
                id=ctx.cash_account_ids["petty_cash"],
                company_id=ctx.company_id,
                account_id=ctx.account_ids["1110"],
                name="Kas Kecil",
                bank_name=None,
                account_number=None,
                account_holder_name=None,
                currency="IDR",
                opening_balance=D("10000000"),
                current_balance=D("10000000"),
                is_active=True,
            ),
            FinanceCashAccount(
                id=ctx.cash_account_ids["main_bank"],
                company_id=ctx.company_id,
                account_id=ctx.account_ids["1120"],
                name="Bank Operasional Utama",
                bank_name="Bank Demo Indonesia",
                account_number=f"8800-{ctx.code.upper()}-001",
                account_holder_name="PT Demo",
                currency="IDR",
                opening_balance=D("250000000"),
                current_balance=D("250000000"),
                is_active=True,
            ),
        ]

        await add_many_if_missing(db, cash_accounts)
        await db.flush()

        transaction_id = sid(f"finance-transaction:{ctx.code}:opening")
        journal_id = sid(f"finance-journal:{ctx.code}:opening")

        await add_if_missing(
            db,
            FinanceTransaction(
                id=transaction_id,
                company_id=ctx.company_id,
                period_id=ctx.period_ids[1],
                branch_id=ctx.branch_ids["hq"],
                cash_account_id=ctx.cash_account_ids["main_bank"],
                transaction_no=f"OPEN-2026-{ctx.code.upper()}",
                transaction_date=date(2026, 1, 1),
                transaction_type=TransactionType.ADJUSTMENT,
                cashflow_activity=CashflowActivity.FINANCING,
                status=TransactionStatus.POSTED,
                counterparty_name="Saldo Awal",
                reference_no=f"OPEN-2026-{ctx.code.upper()}",
                source_module="seed",
                source_id=None,
                subtotal_amount=D("250000000"),
                discount_amount=D("0"),
                tax_amount=D("0"),
                total_amount=D("250000000"),
                description="Saldo awal perusahaan",
                posted_at=datetime.combine(date(2026, 1, 1), time(9, 0)),
                created_by=system_user_ids["superuser"],
            ),
        )

        await db.flush()

        await add_if_missing(
            db,
            FinanceTransactionLine(
                id=sid(f"finance-transaction-line:{ctx.code}:opening:1"),
                transaction_id=transaction_id,
                account_id=ctx.account_ids["1120"],
                tax_rate_id=None,
                description="Saldo awal bank",
                quantity=D("1"),
                unit_price=D("250000000"),
                amount=D("250000000"),
                tax_amount=D("0"),
                total_amount=D("250000000"),
            ),
        )

        await add_if_missing(
            db,
            FinanceJournalEntry(
                id=journal_id,
                company_id=ctx.company_id,
                period_id=ctx.period_ids[1],
                transaction_id=transaction_id,
                journal_no=f"JRN-OPEN-2026-{ctx.code.upper()}",
                journal_date=date(2026, 1, 1),
                status=JournalStatus.POSTED,
                memo="Jurnal saldo awal",
                total_debit=D("250000000"),
                total_credit=D("250000000"),
                is_balanced=True,
                posted_at=datetime.combine(date(2026, 1, 1), time(9, 5)),
                created_by=system_user_ids["superuser"],
            ),
        )

        await db.flush()

        journal_lines = [
            FinanceJournalLine(
                id=sid(f"finance-journal-line:{ctx.code}:opening:1"),
                journal_entry_id=journal_id,
                account_id=ctx.account_ids["1120"],
                description="Debit bank operasional",
                debit_amount=D("250000000"),
                credit_amount=D("0"),
            ),
            FinanceJournalLine(
                id=sid(f"finance-journal-line:{ctx.code}:opening:2"),
                journal_entry_id=journal_id,
                account_id=ctx.account_ids["3100"],
                description="Kredit modal disetor",
                debit_amount=D("0"),
                credit_amount=D("250000000"),
            ),
        ]

        await add_many_if_missing(db, journal_lines)

    await db.flush()