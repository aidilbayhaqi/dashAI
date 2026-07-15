"""security, finance integrity, and realtime permissions

Revision ID: 8c9d0e1f2a34
Revises: 7b8c9d0e1f23
Create Date: 2026-07-12 16:00:00
"""
from __future__ import annotations

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c9d0e1f2a34"
down_revision: Union[str, Sequence[str], None] = "7b8c9d0e1f23"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_NAMESPACE = uuid.UUID("4d1f6d7e-2f5a-4df0-9b14-1df32f8cc001")


def sid(key: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, key)


def _insert_permission(
    bind,
    *,
    module_code: str,
    feature_code: str,
    action: str = "VIEW",
) -> uuid.UUID:
    permission_id = sid(
        f"permission:{module_code}:{feature_code}:{action.lower()}"
    )
    bind.execute(
        sa.text(
            """
            INSERT INTO user_permissions
                (id, module_code, feature_code, action, name, description,
                 is_active, created_at)
            VALUES
                (:id, :module_code, :feature_code,
                 CAST(:action AS user_permission_action_enum),
                 :name, :description, true, NOW())
            ON CONFLICT (module_code, feature_code, action)
            DO UPDATE SET is_active = true
            """
        ),
        {
            "id": permission_id,
            "module_code": module_code,
            "feature_code": feature_code,
            "action": action,
            "name": f"{module_code}.{feature_code}.{action.lower()}",
            "description": (
                f"{action.lower()} permission untuk "
                f"{module_code}.{feature_code}"
            ),
        },
    )
    row = bind.execute(
        sa.text(
            """
            SELECT id FROM user_permissions
            WHERE module_code=:module_code
              AND feature_code=:feature_code
              AND action=CAST(:action AS user_permission_action_enum)
            """
        ),
        {
            "module_code": module_code,
            "feature_code": feature_code,
            "action": action,
        },
    ).scalar_one()
    return uuid.UUID(str(row))


def _assign_permission(bind, permission_id: uuid.UUID, role_codes: set[str] | None):
    rows = bind.execute(
        sa.text("SELECT id, code FROM user_roles WHERE is_active = true")
    ).all()
    role_ids = [
        role_id
        for role_id, role_code in rows
        if role_codes is None or role_code in role_codes
    ]
    for role_id in role_ids:
        link_id = uuid.uuid5(
            SEED_NAMESPACE,
            f"migration-role-permission:{role_id}:{permission_id}",
        )
        bind.execute(
            sa.text(
                """
                INSERT INTO user_role_permissions
                    (id, role_id, permission_id, created_at)
                VALUES (:id, :role_id, :permission_id, NOW())
                ON CONFLICT (role_id, permission_id) DO NOTHING
                """
            ),
            {
                "id": link_id,
                "role_id": role_id,
                "permission_id": permission_id,
            },
        )


def upgrade() -> None:
    bind = op.get_bind()

    dashboard_permission = _insert_permission(
        bind,
        module_code="dashboard",
        feature_code="summary",
    )
    realtime_permission = _insert_permission(
        bind,
        module_code="realtime",
        feature_code="events",
    )
    ai_permission = _insert_permission(
        bind,
        module_code="ai",
        feature_code="analytics",
    )

    _assign_permission(bind, dashboard_permission, None)
    _assign_permission(bind, realtime_permission, None)
    _assign_permission(
        bind,
        ai_permission,
        {"owner", "admin", "finance_manager", "hr_manager", "sales_manager"},
    )

    op.add_column(
        "domain_event_outbox",
        sa.Column("next_attempt_at", sa.DateTime(), nullable=True),
    )

    # NOT VALID protects new writes immediately without failing migration on
    # legacy rows. A later data-cleanup migration can VALIDATE these checks.
    op.execute(
        """
        ALTER TABLE finance_transactions
        ADD CONSTRAINT ck_finance_transaction_nonnegative_components
        CHECK (
            subtotal_amount >= 0 AND discount_amount >= 0 AND tax_amount >= 0
        ) NOT VALID
        """
    )
    op.execute(
        """
        ALTER TABLE finance_transactions
        ADD CONSTRAINT ck_finance_transaction_positive_total
        CHECK (total_amount > 0) NOT VALID
        """
    )
    op.execute(
        """
        ALTER TABLE finance_invoices
        ADD CONSTRAINT ck_finance_invoice_nonnegative_amounts
        CHECK (
            subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount > 0
        ) NOT VALID
        """
    )
    op.execute(
        """
        ALTER TABLE finance_invoices
        ADD CONSTRAINT ck_finance_invoice_paid_within_total
        CHECK (paid_amount >= 0 AND paid_amount <= total_amount) NOT VALID
        """
    )
    op.execute(
        """
        ALTER TABLE finance_journal_entries
        ADD CONSTRAINT ck_finance_journal_nonnegative_totals
        CHECK (total_debit >= 0 AND total_credit >= 0) NOT VALID
        """
    )
    op.create_index(
        "ix_domain_event_outbox_pending_dispatch",
        "domain_event_outbox",
        ["status", "attempts", "next_attempt_at", "occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_domain_event_outbox_pending_dispatch",
        table_name="domain_event_outbox",
    )
    op.drop_column("domain_event_outbox", "next_attempt_at")
    op.execute(
        "ALTER TABLE finance_journal_entries "
        "DROP CONSTRAINT IF EXISTS ck_finance_journal_nonnegative_totals"
    )
    op.execute(
        "ALTER TABLE finance_invoices "
        "DROP CONSTRAINT IF EXISTS ck_finance_invoice_paid_within_total"
    )
    op.execute(
        "ALTER TABLE finance_invoices "
        "DROP CONSTRAINT IF EXISTS ck_finance_invoice_nonnegative_amounts"
    )
    op.execute(
        "ALTER TABLE finance_transactions "
        "DROP CONSTRAINT IF EXISTS ck_finance_transaction_positive_total"
    )
    op.execute(
        "ALTER TABLE finance_transactions "
        "DROP CONSTRAINT IF EXISTS ck_finance_transaction_nonnegative_components"
    )
