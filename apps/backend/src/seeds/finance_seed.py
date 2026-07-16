from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.finance.model_finance import (
    CashflowActivity,
    FinanceAccount,
    FinanceAccountingPeriod,
    FinanceBudget,
    FinanceBudgetLine,
    FinanceCashAccount,
    FinanceCashflowSnapshot,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceTaxRate,
    FinanceTaxRecord,
    FinanceTransaction,
    FinanceTransactionLine,
    JournalStatus,
    PeriodStatus,
    TaxRecordStatus,
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
        # ============================================================
        # 1. ACCOUNTING PERIODS
        # ============================================================
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
        await db.flush()

        # ============================================================
        # 2. CHART OF ACCOUNTS
        # Parent accounts dibuat dulu supaya FK parent_account_id aman.
        # ============================================================
        parent_accounts = []
        child_accounts = []

        for (
            code,
            name,
            account_type,
            normal_balance,
            parent_code,
            is_cash,
            is_bank,
            is_tax,
        ) in FINANCE_ACCOUNTS:
            account = FinanceAccount(
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

            if parent_code:
                child_accounts.append(account)
            else:
                parent_accounts.append(account)

        await add_many_if_missing(db, parent_accounts)
        await db.flush()

        await add_many_if_missing(db, child_accounts)
        await db.flush()

        # ============================================================
        # 3. TAX RATE
        # Dibuat sebelum FinanceTaxRecord.
        # ============================================================
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
        await db.flush()

        # ============================================================
        # 4. CASH ACCOUNTS
        # Dibuat sebelum FinanceTransaction.
        # ============================================================
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
                is_default=False,
            ),
            FinanceCashAccount(
                id=ctx.cash_account_ids["main_bank"],
                company_id=ctx.company_id,
                account_id=ctx.account_ids["1120"],
                name="Bank Operasional Utama",
                bank_name="Bank Demo Indonesia",
                account_number=f"8800-{ctx.code.upper()}-001",
                account_holder_name=f"PT {ctx.code.upper()} Demo",
                currency="IDR",
                opening_balance=D("250000000"),
                current_balance=D("250000000"),
                is_active=True,
                is_default=True,
            ),
        ]

        await add_many_if_missing(db, cash_accounts)
        await db.flush()

        main_cash_account_id = ctx.cash_account_ids["main_bank"]

        # ============================================================
        # 5. OPENING TRANSACTION
        # ============================================================
        opening_transaction_id = sid(f"finance-transaction:{ctx.code}:opening")
        opening_journal_id = sid(f"finance-journal:{ctx.code}:opening")

        await add_if_missing(
            db,
            FinanceTransaction(
                id=opening_transaction_id,
                company_id=ctx.company_id,
                period_id=ctx.period_ids[1],
                branch_id=ctx.branch_ids["hq"],
                cash_account_id=main_cash_account_id,
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
                transaction_id=opening_transaction_id,
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
        await db.flush()

        # ============================================================
        # 6. OPENING JOURNAL
        # ============================================================
        await add_if_missing(
            db,
            FinanceJournalEntry(
                id=opening_journal_id,
                company_id=ctx.company_id,
                period_id=ctx.period_ids[1],
                transaction_id=opening_transaction_id,
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
                journal_entry_id=opening_journal_id,
                account_id=ctx.account_ids["1120"],
                description="Debit bank operasional",
                debit_amount=D("250000000"),
                credit_amount=D("0"),
            ),
            FinanceJournalLine(
                id=sid(f"finance-journal-line:{ctx.code}:opening:2"),
                journal_entry_id=opening_journal_id,
                account_id=ctx.account_ids["3100"],
                description="Kredit modal disetor",
                debit_amount=D("0"),
                credit_amount=D("250000000"),
            ),
        ]

        await add_many_if_missing(db, journal_lines)
        await db.flush()

        # ============================================================
        # 7. COMPANY-SPECIFIC INCOME / EXPENSE SAMPLE
        # Data dibuat beda supaya superadmin tidak bingung lihat data all company.
        # ============================================================
        if ctx.code == "nrt":
            income_title = "Pembayaran POS Sinar Mart"
            expense_title = "Pembelian Thermal Label Roll"
            income_amount = D("18500000")
            expense_amount = D("4200000")
            operating_in = D("18500000")
            operating_out = D("4200000")
        else:
            income_title = "Pembayaran Supply Material Dumai"
            expense_title = "Pembelian Semen dan Besi Proyek"
            income_amount = D("135000000")
            expense_amount = D("64500000")
            operating_in = D("135000000")
            operating_out = D("64500000")

        income_transaction_id = sid(f"finance-transaction:{ctx.code}:income-001")
        expense_transaction_id = sid(f"finance-transaction:{ctx.code}:expense-001")

        finance_transactions = [
            FinanceTransaction(
                id=income_transaction_id,
                company_id=ctx.company_id,
                period_id=ctx.period_ids[6],
                branch_id=ctx.branch_ids["hq"],
                cash_account_id=main_cash_account_id,
                transaction_no=f"INC-{ctx.code.upper()}-2026-001",
                transaction_date=date(2026, 6, 10),
                transaction_type=TransactionType.INCOME,
                cashflow_activity=CashflowActivity.OPERATING,
                status=TransactionStatus.POSTED,
                counterparty_name=income_title,
                reference_no=f"INV-{ctx.code.upper()}-2026-001",
                source_module="crm",
                source_id=None,
                subtotal_amount=income_amount,
                discount_amount=D("0"),
                tax_amount=income_amount * D("0.11"),
                total_amount=income_amount * D("1.11"),
                description=income_title,
                posted_at=datetime.combine(date(2026, 6, 10), time(10, 0)),
                created_by=system_user_ids["superuser"],
            ),
            FinanceTransaction(
                id=expense_transaction_id,
                company_id=ctx.company_id,
                period_id=ctx.period_ids[6],
                branch_id=ctx.branch_ids["hq"],
                cash_account_id=main_cash_account_id,
                transaction_no=f"EXP-{ctx.code.upper()}-2026-001",
                transaction_date=date(2026, 6, 15),
                transaction_type=TransactionType.EXPENSE,
                cashflow_activity=CashflowActivity.OPERATING,
                status=TransactionStatus.POSTED,
                counterparty_name=expense_title,
                reference_no=f"BILL-{ctx.code.upper()}-2026-001",
                source_module="purchase",
                source_id=None,
                subtotal_amount=expense_amount,
                discount_amount=D("0"),
                tax_amount=expense_amount * D("0.11"),
                total_amount=expense_amount * D("1.11"),
                description=expense_title,
                posted_at=datetime.combine(date(2026, 6, 15), time(14, 0)),
                created_by=system_user_ids["superuser"],
            ),
        ]

        await add_many_if_missing(db, finance_transactions)
        await db.flush()

        # ============================================================
        # 8. TRANSACTION LINES
        # ============================================================
        transaction_lines = [
            FinanceTransactionLine(
                id=sid(f"finance-transaction-line:{ctx.code}:income-001:1"),
                transaction_id=income_transaction_id,
                account_id=ctx.account_ids["4100"],
                tax_rate_id=ctx.tax_rate_ids["ppn"],
                description=income_title,
                quantity=D("1"),
                unit_price=income_amount,
                amount=income_amount,
                tax_amount=income_amount * D("0.11"),
                total_amount=income_amount * D("1.11"),
            ),
            FinanceTransactionLine(
                id=sid(f"finance-transaction-line:{ctx.code}:expense-001:1"),
                transaction_id=expense_transaction_id,
                account_id=ctx.account_ids["6000"],
                tax_rate_id=ctx.tax_rate_ids["ppn"],
                description=expense_title,
                quantity=D("1"),
                unit_price=expense_amount,
                amount=expense_amount,
                tax_amount=expense_amount * D("0.11"),
                total_amount=expense_amount * D("1.11"),
            ),
        ]

        await add_many_if_missing(db, transaction_lines)
        await db.flush()

        # ============================================================
        # 9. TAX RECORD
        # Dibuat setelah tax rate dan income transaction ada.
        # ============================================================
        tax_records = [
            FinanceTaxRecord(
                id=sid(f"finance-tax-record:{ctx.code}:ppn-2026-06"),
                company_id=ctx.company_id,
                period_id=ctx.period_ids[6],
                tax_rate_id=ctx.tax_rate_ids["ppn"],
                transaction_id=income_transaction_id,
                tax_type=TaxType.PPN,
                tax_period="2026-06",
                taxable_amount=income_amount,
                tax_amount=income_amount * D("0.11"),
                paid_amount=D("0"),
                status=TaxRecordStatus.ACCRUED,
                due_date=date(2026, 7, 15),
                paid_date=None,
                reported_date=None,
                reference_no=f"PPN-{ctx.code.upper()}-2026-06",
                notes=f"PPN keluaran {ctx.code.upper()} Juni 2026",
            )
        ]

        await add_many_if_missing(db, tax_records)
        await db.flush()

        # ============================================================
        # 10. BUDGET
        # ============================================================
        budget_id = sid(f"finance-budget:{ctx.code}:2026:operational")

        await add_many_if_missing(
            db,
            [
                FinanceBudget(
                    id=budget_id,
                    company_id=ctx.company_id,
                    name=f"Budget Operasional {ctx.code.upper()} 2026",
                    fiscal_year=2026,
                    status="active",
                    total_budget_amount=D("500000000")
                    if ctx.code == "nrt"
                    else D("2500000000"),
                    notes=f"Budget operasional khusus {ctx.code.upper()}",
                )
            ],
        )
        await db.flush()

        await add_many_if_missing(
            db,
            [
                FinanceBudgetLine(
                    id=sid(f"finance-budget-line:{ctx.code}:6100:2026"),
                    budget_id=budget_id,
                    account_id=ctx.account_ids["6100"],
                    period_number=6,
                    budget_amount=D("90000000")
                    if ctx.code == "nrt"
                    else D("180000000"),
                    actual_amount=D("55000000")
                    if ctx.code == "nrt"
                    else D("125000000"),
                    variance_amount=D("35000000")
                    if ctx.code == "nrt"
                    else D("55000000"),
                    variance_percent=D("38.8889")
                    if ctx.code == "nrt"
                    else D("30.5556"),
                )
            ],
        )
        await db.flush()

        # ============================================================
        # 11. CASHFLOW SNAPSHOT
        # ============================================================
        await add_many_if_missing(
            db,
            [
                FinanceCashflowSnapshot(
                    id=sid(f"finance-cashflow-snapshot:{ctx.code}:2026-06"),
                    company_id=ctx.company_id,
                    period_id=ctx.period_ids[6],
                    report_date=date(2026, 6, 30),
                    beginning_cash_balance=D("250000000"),
                    operating_cash_in=operating_in,
                    operating_cash_out=operating_out,
                    investing_cash_in=D("0"),
                    investing_cash_out=D("0"),
                    financing_cash_in=D("0"),
                    financing_cash_out=D("0"),
                    net_cashflow=operating_in - operating_out,
                    ending_cash_balance=D("250000000") + operating_in - operating_out,
                )
            ],
        )
        await db.flush()

    await db.flush()