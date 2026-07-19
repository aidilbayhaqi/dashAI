from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.finance.model_finance import (
    AccountType,
    FinanceAccount,
    NormalBalance,
)


@dataclass(frozen=True, slots=True)
class DefaultFinanceAccount:
    code: str
    name: str
    account_type: AccountType
    normal_balance: NormalBalance
    parent_code: str | None = None
    is_cash_account: bool = False
    is_bank_account: bool = False
    is_tax_account: bool = False


DEFAULT_FINANCE_ACCOUNTS: tuple[DefaultFinanceAccount, ...] = (
    DefaultFinanceAccount(
        "1000",
        "Aset",
        AccountType.ASSET,
        NormalBalance.DEBIT,
    ),
    DefaultFinanceAccount(
        "1100",
        "Kas dan Setara Kas",
        AccountType.ASSET,
        NormalBalance.DEBIT,
        "1000",
        is_cash_account=True,
    ),
    DefaultFinanceAccount(
        "1110",
        "Kas Kecil",
        AccountType.ASSET,
        NormalBalance.DEBIT,
        "1100",
        is_cash_account=True,
    ),
    DefaultFinanceAccount(
        "1120",
        "Bank Operasional",
        AccountType.ASSET,
        NormalBalance.DEBIT,
        "1100",
        is_cash_account=True,
        is_bank_account=True,
    ),
    DefaultFinanceAccount(
        "1200",
        "Piutang Usaha",
        AccountType.ASSET,
        NormalBalance.DEBIT,
        "1000",
    ),
    DefaultFinanceAccount(
        "1300",
        "Persediaan",
        AccountType.ASSET,
        NormalBalance.DEBIT,
        "1000",
    ),
    DefaultFinanceAccount(
        "2000",
        "Liabilitas",
        AccountType.LIABILITY,
        NormalBalance.CREDIT,
    ),
    DefaultFinanceAccount(
        "2100",
        "Utang Usaha",
        AccountType.LIABILITY,
        NormalBalance.CREDIT,
        "2000",
    ),
    DefaultFinanceAccount(
        "2200",
        "Utang Pajak",
        AccountType.LIABILITY,
        NormalBalance.CREDIT,
        "2000",
        is_tax_account=True,
    ),
    DefaultFinanceAccount(
        "2300",
        "Utang Gaji",
        AccountType.LIABILITY,
        NormalBalance.CREDIT,
        "2000",
    ),
    DefaultFinanceAccount(
        "3000",
        "Ekuitas",
        AccountType.EQUITY,
        NormalBalance.CREDIT,
    ),
    DefaultFinanceAccount(
        "3100",
        "Modal Disetor",
        AccountType.EQUITY,
        NormalBalance.CREDIT,
        "3000",
    ),
    DefaultFinanceAccount(
        "4000",
        "Pendapatan",
        AccountType.REVENUE,
        NormalBalance.CREDIT,
    ),
    DefaultFinanceAccount(
        "4100",
        "Pendapatan Penjualan",
        AccountType.REVENUE,
        NormalBalance.CREDIT,
        "4000",
    ),
    DefaultFinanceAccount(
        "5000",
        "Harga Pokok Penjualan",
        AccountType.COST_OF_GOODS_SOLD,
        NormalBalance.DEBIT,
    ),
    DefaultFinanceAccount(
        "5100",
        "HPP Barang",
        AccountType.COST_OF_GOODS_SOLD,
        NormalBalance.DEBIT,
        "5000",
    ),
    DefaultFinanceAccount(
        "6000",
        "Beban Operasional",
        AccountType.EXPENSE,
        NormalBalance.DEBIT,
    ),
    DefaultFinanceAccount(
        "6100",
        "Beban Gaji",
        AccountType.EXPENSE,
        NormalBalance.DEBIT,
        "6000",
    ),
    DefaultFinanceAccount(
        "6200",
        "Beban Operasional Lainnya",
        AccountType.EXPENSE,
        NormalBalance.DEBIT,
        "6000",
    ),
    DefaultFinanceAccount(
        "6300",
        "Beban Pajak",
        AccountType.TAX,
        NormalBalance.DEBIT,
        "6000",
        is_tax_account=True,
    ),
)


async def ensure_default_chart_of_accounts(
    db: AsyncSession,
    *,
    company_id: UUID,
) -> dict[str, FinanceAccount]:
    """Create the ERP accounting catalog for one company if it is incomplete."""

    result = await db.execute(
        select(FinanceAccount).where(FinanceAccount.company_id == company_id)
    )
    accounts_by_code = {
        account.code: account for account in result.scalars().all()
    }

    for specification in DEFAULT_FINANCE_ACCOUNTS:
        parent = (
            accounts_by_code.get(specification.parent_code)
            if specification.parent_code
            else None
        )
        account = accounts_by_code.get(specification.code)

        if account is None:
            account = FinanceAccount(
                company_id=company_id,
                parent_account_id=parent.id if parent else None,
                code=specification.code,
                name=specification.name,
                account_type=specification.account_type,
                normal_balance=specification.normal_balance,
                description="Default ERP chart of accounts",
                is_cash_account=specification.is_cash_account,
                is_bank_account=specification.is_bank_account,
                is_tax_account=specification.is_tax_account,
                is_active=True,
            )
            db.add(account)
            await db.flush()
            accounts_by_code[specification.code] = account
            continue

        account.is_active = True
        account.is_cash_account = (
            account.is_cash_account or specification.is_cash_account
        )
        account.is_bank_account = (
            account.is_bank_account or specification.is_bank_account
        )
        account.is_tax_account = (
            account.is_tax_account or specification.is_tax_account
        )
        if account.parent_account_id is None and parent is not None:
            account.parent_account_id = parent.id

    await db.flush()
    return accounts_by_code
