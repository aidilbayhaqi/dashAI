"""Backfill cash accounts for automated sales transactions.

Revision ID: 9d0e1f2a3b45
Revises: 8c9d0e1f2a34
"""

from typing import Sequence, Union

from alembic import op


revision: str = "9d0e1f2a3b45"
down_revision: Union[str, Sequence[str], None] = "8c9d0e1f2a34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE finance_transactions AS transaction
        SET cash_account_id = (
            SELECT account.id
            FROM finance_cash_accounts AS account
            WHERE account.company_id = transaction.company_id
              AND account.is_active IS TRUE
            ORDER BY
              CASE
                WHEN LOWER(account.name) LIKE '%utama%' THEN 0
                WHEN LOWER(account.name) LIKE '%operasional%' THEN 1
                WHEN LOWER(account.name) LIKE '%bank%' THEN 2
                ELSE 3
              END,
              account.created_at ASC,
              account.name ASC,
              account.id ASC
            LIMIT 1
        )
        WHERE transaction.cash_account_id IS NULL
          AND transaction.source_module = 'sales_order'
          AND EXISTS (
              SELECT 1
              FROM finance_cash_accounts AS account
              WHERE account.company_id = transaction.company_id
                AND account.is_active IS TRUE
          )
        """
    )


def downgrade() -> None:
    # This migration only repairs missing references. Removing a valid cash
    # account assignment on downgrade would destroy business information.
    pass
