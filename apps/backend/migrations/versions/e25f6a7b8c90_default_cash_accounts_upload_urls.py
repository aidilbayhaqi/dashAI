"""Backfill default cash accounts and normalize managed upload URLs.

Revision ID: e25f6a7b8c90
Revises: d14e5f6a7b89
"""

from typing import Sequence, Union

from alembic import op


revision: str = "e25f6a7b8c90"
down_revision: Union[str, Sequence[str], None] = "d14e5f6a7b89"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reuse an existing 1001 ledger account as cash when a legacy company has
    # no cash-enabled ledger account yet.
    op.execute(
        """
        UPDATE finance_accounts AS account
        SET is_cash_account = TRUE,
            is_active = TRUE,
            updated_at = NOW()
        WHERE account.code = '1001'
          AND NOT EXISTS (
              SELECT 1
              FROM finance_accounts AS cash_ledger
              WHERE cash_ledger.company_id = account.company_id
                AND cash_ledger.is_cash_account = TRUE
          )
        """
    )

    op.execute(
        """
        INSERT INTO finance_accounts (
            id, company_id, parent_account_id, code, name, account_type,
            normal_balance, description, is_cash_account, is_bank_account,
            is_tax_account, is_active, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), company.id, NULL, '1001', 'Kas Utama',
            'ASSET'::finance_account_type_enum,
            'DEBIT'::finance_normal_balance_enum,
            'Default cash ledger account for production company',
            TRUE, FALSE, FALSE, TRUE, NOW(), NOW()
        FROM companies AS company
        WHERE NOT EXISTS (
            SELECT 1
            FROM finance_accounts AS existing
            WHERE existing.company_id = company.id
              AND existing.is_cash_account = TRUE
        )
          AND NOT EXISTS (
            SELECT 1
            FROM finance_accounts AS same_code
            WHERE same_code.company_id = company.id
              AND same_code.code = '1001'
        )
        """
    )

    op.execute(
        """
        INSERT INTO finance_cash_accounts (
            id, company_id, account_id, name, bank_name, account_number,
            account_holder_name, currency, opening_balance, current_balance,
            is_active, is_default, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), company.id, ledger.id, 'Kas Utama', NULL, NULL,
            company.name, 'IDR', 0.00, 0.00, TRUE, TRUE, NOW(), NOW()
        FROM companies AS company
        JOIN LATERAL (
            SELECT account.id
            FROM finance_accounts AS account
            WHERE account.company_id = company.id
              AND account.is_cash_account = TRUE
              AND account.is_active = TRUE
            ORDER BY
                CASE WHEN account.code = '1001' THEN 0 ELSE 1 END,
                account.code ASC,
                account.created_at ASC
            LIMIT 1
        ) AS ledger ON TRUE
        WHERE NOT EXISTS (
            SELECT 1
            FROM finance_cash_accounts AS existing
            WHERE existing.company_id = company.id
        )
        """
    )

    # Guarantee one default account for companies that already had cash
    # accounts but none marked as default.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                account.id,
                account.company_id,
                ROW_NUMBER() OVER (
                    PARTITION BY account.company_id
                    ORDER BY account.created_at ASC, account.id ASC
                ) AS row_number
            FROM finance_cash_accounts AS account
            WHERE account.is_active = TRUE
              AND NOT EXISTS (
                  SELECT 1
                  FROM finance_cash_accounts AS current_default
                  WHERE current_default.company_id = account.company_id
                    AND current_default.is_default = TRUE
              )
        )
        UPDATE finance_cash_accounts AS account
        SET is_default = TRUE,
            updated_at = NOW()
        FROM ranked
        WHERE account.id = ranked.id
          AND ranked.row_number = 1
        """
    )

    # Absolute upload URLs become stale whenever a Railway domain changes.
    # Store managed file paths as relative URLs so the frontend can always
    # resolve them against the currently deployed API origin.
    managed_columns = (
        ("products", "image_url"),
        ("product_categories", "image_url"),
        ("companies", "logo_url"),
        ("users", "avatar_url"),
        ("hr_employees", "photo_url"),
    )
    for table_name, column_name in managed_columns:
        op.execute(
            f"""
            UPDATE {table_name}
            SET {column_name} = regexp_replace(
                {column_name},
                '^https?://[^/]+',
                ''
            )
            WHERE {column_name} ~ '^https?://[^/]+/(uploads/|api/v1/files/private/)'
            """
        )


def downgrade() -> None:
    # Data backfills and URL normalization are intentionally not reversed.
    pass
