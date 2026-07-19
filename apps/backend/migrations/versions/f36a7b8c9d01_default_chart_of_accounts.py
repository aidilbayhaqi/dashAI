"""Backfill the default ERP chart of accounts for every company.

Revision ID: f36a7b8c9d01
Revises: e25f6a7b8c90
"""

from typing import Sequence, Union

from alembic import op


revision: str = "f36a7b8c9d01"
down_revision: Union[str, Sequence[str], None] = "e25f6a7b8c90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_ACCOUNTS = (
    ("1000", "Aset", "ASSET", "DEBIT", None, False, False, False),
    (
        "1100",
        "Kas dan Setara Kas",
        "ASSET",
        "DEBIT",
        "1000",
        True,
        False,
        False,
    ),
    ("1110", "Kas Kecil", "ASSET", "DEBIT", "1100", True, False, False),
    (
        "1120",
        "Bank Operasional",
        "ASSET",
        "DEBIT",
        "1100",
        True,
        True,
        False,
    ),
    ("1200", "Piutang Usaha", "ASSET", "DEBIT", "1000", False, False, False),
    ("1300", "Persediaan", "ASSET", "DEBIT", "1000", False, False, False),
    ("2000", "Liabilitas", "LIABILITY", "CREDIT", None, False, False, False),
    (
        "2100",
        "Utang Usaha",
        "LIABILITY",
        "CREDIT",
        "2000",
        False,
        False,
        False,
    ),
    (
        "2200",
        "Utang Pajak",
        "LIABILITY",
        "CREDIT",
        "2000",
        False,
        False,
        True,
    ),
    (
        "2300",
        "Utang Gaji",
        "LIABILITY",
        "CREDIT",
        "2000",
        False,
        False,
        False,
    ),
    ("3000", "Ekuitas", "EQUITY", "CREDIT", None, False, False, False),
    (
        "3100",
        "Modal Disetor",
        "EQUITY",
        "CREDIT",
        "3000",
        False,
        False,
        False,
    ),
    ("4000", "Pendapatan", "REVENUE", "CREDIT", None, False, False, False),
    (
        "4100",
        "Pendapatan Penjualan",
        "REVENUE",
        "CREDIT",
        "4000",
        False,
        False,
        False,
    ),
    (
        "5000",
        "Harga Pokok Penjualan",
        "COST_OF_GOODS_SOLD",
        "DEBIT",
        None,
        False,
        False,
        False,
    ),
    (
        "5100",
        "HPP Barang",
        "COST_OF_GOODS_SOLD",
        "DEBIT",
        "5000",
        False,
        False,
        False,
    ),
    ("6000", "Beban Operasional", "EXPENSE", "DEBIT", None, False, False, False),
    (
        "6100",
        "Beban Gaji",
        "EXPENSE",
        "DEBIT",
        "6000",
        False,
        False,
        False,
    ),
    (
        "6200",
        "Beban Operasional Lainnya",
        "EXPENSE",
        "DEBIT",
        "6000",
        False,
        False,
        False,
    ),
    ("6300", "Beban Pajak", "TAX", "DEBIT", "6000", False, False, True),
)


def _sql_bool(value: bool) -> str:
    return "TRUE" if value else "FALSE"


def upgrade() -> None:
    for (
        code,
        name,
        account_type,
        normal_balance,
        parent_code,
        is_cash,
        is_bank,
        is_tax,
    ) in DEFAULT_ACCOUNTS:
        parent_expression = "NULL"
        if parent_code is not None:
            parent_expression = f"""
                (
                    SELECT parent.id
                    FROM finance_accounts AS parent
                    WHERE parent.company_id = company.id
                      AND parent.code = '{parent_code}'
                    LIMIT 1
                )
            """

        op.execute(
            f"""
            INSERT INTO finance_accounts (
                id, company_id, parent_account_id, code, name, account_type,
                normal_balance, description, is_cash_account,
                is_bank_account, is_tax_account, is_active,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(), company.id, {parent_expression},
                '{code}', '{name}',
                '{account_type}'::finance_account_type_enum,
                '{normal_balance}'::finance_normal_balance_enum,
                'Default ERP chart of accounts',
                {_sql_bool(is_cash)}, {_sql_bool(is_bank)},
                {_sql_bool(is_tax)}, TRUE, NOW(), NOW()
            FROM companies AS company
            WHERE NOT EXISTS (
                SELECT 1
                FROM finance_accounts AS existing
                WHERE existing.company_id = company.id
                  AND existing.code = '{code}'
            )
            """
        )

        op.execute(
            f"""
            UPDATE finance_accounts
            SET is_active = TRUE,
                is_cash_account = is_cash_account OR {_sql_bool(is_cash)},
                is_bank_account = is_bank_account OR {_sql_bool(is_bank)},
                is_tax_account = is_tax_account OR {_sql_bool(is_tax)},
                updated_at = NOW()
            WHERE code = '{code}'
            """
        )


def downgrade() -> None:
    # Production chart-of-account backfills are intentionally retained.
    pass
