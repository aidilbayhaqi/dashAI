"""AI action audit production hardening.

Revision ID: bf2a3b4c5d67
Revises: ae1f2a3b4c56
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "bf2a3b4c5d67"
down_revision: Union[str, Sequence[str], None] = "ae1f2a3b4c56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_action_audits",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("branch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("draft_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_jti", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action_type", sa.String(length=80), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("target_type", sa.String(length=80), nullable=True),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["company_branches.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_action_audits_company_id",
        "ai_action_audits",
        ["company_id"],
    )
    op.create_index(
        "ix_ai_action_audits_branch_id",
        "ai_action_audits",
        ["branch_id"],
    )
    op.create_index(
        "ix_ai_action_audits_user_id",
        "ai_action_audits",
        ["user_id"],
    )
    op.create_index(
        "ix_ai_action_audits_draft_id",
        "ai_action_audits",
        ["draft_id"],
    )
    op.create_index(
        "ix_ai_action_audits_token_jti",
        "ai_action_audits",
        ["token_jti"],
    )
    op.create_index(
        "ix_ai_action_audits_action_type",
        "ai_action_audits",
        ["action_type"],
    )
    op.create_index(
        "ix_ai_action_audits_status",
        "ai_action_audits",
        ["status"],
    )
    op.create_index(
        "ix_ai_action_audits_target_id",
        "ai_action_audits",
        ["target_id"],
    )
    op.create_index(
        "ix_ai_action_audits_company_created",
        "ai_action_audits",
        ["company_id", "created_at"],
    )
    op.create_index(
        "ix_ai_action_audits_company_action_status",
        "ai_action_audits",
        ["company_id", "action_type", "status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_action_audits_company_action_status",
        table_name="ai_action_audits",
    )
    op.drop_index(
        "ix_ai_action_audits_company_created",
        table_name="ai_action_audits",
    )
    op.drop_index("ix_ai_action_audits_target_id", table_name="ai_action_audits")
    op.drop_index("ix_ai_action_audits_status", table_name="ai_action_audits")
    op.drop_index("ix_ai_action_audits_action_type", table_name="ai_action_audits")
    op.drop_index("ix_ai_action_audits_token_jti", table_name="ai_action_audits")
    op.drop_index("ix_ai_action_audits_draft_id", table_name="ai_action_audits")
    op.drop_index("ix_ai_action_audits_user_id", table_name="ai_action_audits")
    op.drop_index("ix_ai_action_audits_branch_id", table_name="ai_action_audits")
    op.drop_index("ix_ai_action_audits_company_id", table_name="ai_action_audits")
    op.drop_table("ai_action_audits")
