"""ERP integrity and accounting bridge.

Revision ID: ae1f2a3b4c56
Revises: 9d0e1f2a3b45
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "ae1f2a3b4c56"
down_revision: Union[str, Sequence[str], None] = "9d0e1f2a3b45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "finance_cash_accounts",
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        """
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY company_id
                ORDER BY is_active DESC, created_at ASC, id ASC
            ) AS row_number
            FROM finance_cash_accounts
            WHERE is_active = TRUE
        )
        UPDATE finance_cash_accounts AS account
        SET is_default = TRUE
        FROM ranked
        WHERE account.id = ranked.id AND ranked.row_number = 1
        """
    )
    op.create_index(
        "uq_finance_cash_account_default_company",
        "finance_cash_accounts",
        ["company_id"],
        unique=True,
        postgresql_where=sa.text("is_default = TRUE"),
    )

    op.alter_column(
        "finance_cash_accounts",
        "is_default",
        server_default=None,
    )

    op.add_column(
        "finance_tax_records",
        sa.Column(
            "invoice_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_finance_tax_records_invoice_id",
        "finance_tax_records",
        "finance_invoices",
        ["invoice_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_finance_tax_records_invoice_id",
        "finance_tax_records",
        ["invoice_id"],
    )

    op.execute(
        """
        UPDATE finance_tax_records AS tax
        SET invoice_id = invoice.id
        FROM finance_invoices AS invoice
        WHERE tax.invoice_id IS NULL
          AND tax.company_id = invoice.company_id
          AND tax.reference_no = invoice.invoice_no
        """
    )

    # Keep the oldest automatic tax record when legacy data contains duplicates.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY company_id, invoice_id, tax_type
                    ORDER BY created_at ASC, id ASC
                ) AS row_number
            FROM finance_tax_records
            WHERE invoice_id IS NOT NULL
        )
        DELETE FROM finance_tax_records
        WHERE id IN (
            SELECT id FROM ranked WHERE row_number > 1
        )
        """
    )

    op.create_unique_constraint(
        "uq_finance_tax_record_company_invoice_type",
        "finance_tax_records",
        ["company_id", "invoice_id", "tax_type"],
    )

    op.add_column(
        "crm_deals",
        sa.Column(
            "invoice_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_crm_deals_invoice_id",
        "crm_deals",
        "finance_invoices",
        ["invoice_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_crm_deals_invoice_id",
        "crm_deals",
        ["invoice_id"],
    )

    op.create_index(
        "uq_finance_transaction_automation_source",
        "finance_transactions",
        ["company_id", "source_module", "source_id"],
        unique=True,
        postgresql_where=sa.text(
            "source_id IS NOT NULL "
            "AND source_module IN ('crm_deal', 'hr_payroll')"
        ),
    )
    op.create_index(
        "uq_finance_invoice_crm_deal_source",
        "finance_invoices",
        ["company_id", "source_module", "source_id"],
        unique=True,
        postgresql_where=sa.text(
            "source_id IS NOT NULL AND source_module = 'crm_deal'"
        ),
    )

    op.execute(
        """
        UPDATE finance_accounts
        SET account_type = 'LIABILITY'::finance_account_type_enum,
            normal_balance = 'CREDIT'::finance_normal_balance_enum,
            is_tax_account = TRUE,
            updated_at = NOW()
        WHERE code = '2200'
        """
    )
    op.execute(
        """
        INSERT INTO finance_accounts (
            id, company_id, parent_account_id, code, name, account_type,
            normal_balance, description, is_cash_account, is_bank_account,
            is_tax_account, is_active, created_at, updated_at
        )
        SELECT gen_random_uuid(), company.id, parent.id, '6300', 'Beban Pajak',
               'TAX'::finance_account_type_enum,
               'DEBIT'::finance_normal_balance_enum,
               'Beban pajak perusahaan', FALSE, FALSE, TRUE, TRUE, NOW(), NOW()
        FROM companies AS company
        JOIN finance_accounts AS parent
          ON parent.company_id = company.id AND parent.code = '6000'
        WHERE NOT EXISTS (
            SELECT 1 FROM finance_accounts AS existing
            WHERE existing.company_id = company.id AND existing.code = '6300'
        )
        """
    )

    # Existing companies need the controlled payroll liability account used by
    # the accounting bridge. Seeded/new companies receive the same account via
    # FINANCE_ACCOUNTS.
    op.execute(
        """
        INSERT INTO finance_accounts (
            id,
            company_id,
            parent_account_id,
            code,
            name,
            account_type,
            normal_balance,
            description,
            is_cash_account,
            is_bank_account,
            is_tax_account,
            is_active,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            company.id,
            parent.id,
            '2300',
            'Utang Gaji',
            'LIABILITY'::finance_account_type_enum,
            'CREDIT'::finance_normal_balance_enum,
            'Kewajiban payroll yang telah dihitung tetapi belum dibayar',
            FALSE,
            FALSE,
            FALSE,
            TRUE,
            NOW(),
            NOW()
        FROM companies AS company
        JOIN finance_accounts AS parent
          ON parent.company_id = company.id
         AND parent.code = '2000'
        WHERE NOT EXISTS (
            SELECT 1
            FROM finance_accounts AS existing
            WHERE existing.company_id = company.id
              AND existing.code = '2300'
        )
        """
    )


def downgrade() -> None:
    op.drop_index(
        "uq_finance_cash_account_default_company",
        table_name="finance_cash_accounts",
    )
    op.drop_column("finance_cash_accounts", "is_default")

    op.drop_index(
        "uq_finance_invoice_crm_deal_source",
        table_name="finance_invoices",
    )
    op.drop_index(
        "uq_finance_transaction_automation_source",
        table_name="finance_transactions",
    )

    op.drop_index("ix_crm_deals_invoice_id", table_name="crm_deals")
    op.drop_constraint(
        "fk_crm_deals_invoice_id",
        "crm_deals",
        type_="foreignkey",
    )
    op.drop_column("crm_deals", "invoice_id")

    op.drop_constraint(
        "uq_finance_tax_record_company_invoice_type",
        "finance_tax_records",
        type_="unique",
    )
    op.drop_index(
        "ix_finance_tax_records_invoice_id",
        table_name="finance_tax_records",
    )
    op.drop_constraint(
        "fk_finance_tax_records_invoice_id",
        "finance_tax_records",
        type_="foreignkey",
    )
    op.drop_column("finance_tax_records", "invoice_id")

    # Account 2300 is retained on downgrade because it may already have journal
    # references. Removing it would violate accounting integrity.
