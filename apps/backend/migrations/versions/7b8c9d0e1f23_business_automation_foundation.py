"""business automation foundation

Revision ID: 7b8c9d0e1f23
Revises: 5d9a1c7e4b20
Create Date: 2026-07-11 16:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "7b8c9d0e1f23"
down_revision: Union[str, Sequence[str], None] = "5d9a1c7e4b20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


sales_order_status = postgresql.ENUM(
    "DRAFT",
    "APPROVED",
    "FULFILLED",
    "CANCELLED",
    name="sales_order_status_enum",
    create_type=False,
)

domain_event_status = postgresql.ENUM(
    "PENDING",
    "PROCESSED",
    "FAILED",
    name="domain_event_status_enum",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(
        "DRAFT",
        "APPROVED",
        "FULFILLED",
        "CANCELLED",
        name="sales_order_status_enum",
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        "PENDING",
        "PROCESSED",
        "FAILED",
        name="domain_event_status_enum",
    ).create(bind, checkfirst=True)

    op.add_column(
        "finance_transactions",
        sa.Column(
            "creation_mode",
            sa.String(length=20),
            nullable=False,
            server_default="manual",
        ),
    )
    op.add_column(
        "finance_invoices",
        sa.Column(
            "creation_mode",
            sa.String(length=20),
            nullable=False,
            server_default="manual",
        ),
    )

    op.create_table(
        "sales_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("branch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_no", sa.String(length=100), nullable=False),
        sa.Column("customer_name", sa.String(length=180), nullable=False),
        sa.Column("order_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sales_order_status, nullable=False),
        sa.Column("creation_mode", sa.String(length=20), nullable=False),
        sa.Column("auto_process", sa.Boolean(), nullable=False),
        sa.Column("subtotal_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("total_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["branch_id"], ["company_branches.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["transaction_id"], ["finance_transactions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["invoice_id"], ["finance_invoices.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "order_no", name="uq_sales_order_company_no"),
    )
    op.create_index("ix_sales_orders_company_id", "sales_orders", ["company_id"])
    op.create_index("ix_sales_orders_branch_id", "sales_orders", ["branch_id"])
    op.create_index("ix_sales_orders_transaction_id", "sales_orders", ["transaction_id"])
    op.create_index("ix_sales_orders_invoice_id", "sales_orders", ["invoice_id"])
    op.create_index("ix_sales_orders_company_status", "sales_orders", ["company_id", "status"])
    op.create_index("ix_sales_orders_company_date", "sales_orders", ["company_id", "order_date"])

    op.create_table(
        "sales_order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sales_order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("unit_price", sa.Numeric(18, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("total_amount", sa.Numeric(18, 2), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sales_order_id"], ["sales_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sales_order_items_sales_order_id", "sales_order_items", ["sales_order_id"])
    op.create_index("ix_sales_order_items_product_id", "sales_order_items", ["product_id"])
    op.create_index("ix_sales_order_items_order_product", "sales_order_items", ["sales_order_id", "product_id"])

    op.create_table(
        "domain_event_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("aggregate_type", sa.String(length=100), nullable=False),
        sa.Column("aggregate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=140), nullable=False),
        sa.Column("event_key", sa.String(length=255), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", domain_event_status, nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_key", name="uq_domain_event_outbox_event_key"),
    )
    op.create_index("ix_domain_event_outbox_company_id", "domain_event_outbox", ["company_id"])
    op.create_index("ix_domain_event_outbox_company_status", "domain_event_outbox", ["company_id", "status"])
    op.create_index("ix_domain_event_outbox_aggregate", "domain_event_outbox", ["aggregate_type", "aggregate_id"])

    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS
                uq_finance_transaction_sales_order_source
            ON finance_transactions (company_id, source_module, source_id)
            WHERE source_id IS NOT NULL AND source_module = 'sales_order'
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS
                uq_finance_invoice_sales_order_source
            ON finance_invoices (company_id, source_module, source_id)
            WHERE source_id IS NOT NULL AND source_module = 'sales_order'
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS uq_finance_invoice_sales_order_source"))
    op.execute(sa.text("DROP INDEX IF EXISTS uq_finance_transaction_sales_order_source"))

    op.drop_index("ix_domain_event_outbox_aggregate", table_name="domain_event_outbox")
    op.drop_index("ix_domain_event_outbox_company_status", table_name="domain_event_outbox")
    op.drop_index("ix_domain_event_outbox_company_id", table_name="domain_event_outbox")
    op.drop_table("domain_event_outbox")

    op.drop_index("ix_sales_order_items_order_product", table_name="sales_order_items")
    op.drop_index("ix_sales_order_items_product_id", table_name="sales_order_items")
    op.drop_index("ix_sales_order_items_sales_order_id", table_name="sales_order_items")
    op.drop_table("sales_order_items")

    op.drop_index("ix_sales_orders_company_date", table_name="sales_orders")
    op.drop_index("ix_sales_orders_company_status", table_name="sales_orders")
    op.drop_index("ix_sales_orders_invoice_id", table_name="sales_orders")
    op.drop_index("ix_sales_orders_transaction_id", table_name="sales_orders")
    op.drop_index("ix_sales_orders_branch_id", table_name="sales_orders")
    op.drop_index("ix_sales_orders_company_id", table_name="sales_orders")
    op.drop_table("sales_orders")

    op.drop_column("finance_invoices", "creation_mode")
    op.drop_column("finance_transactions", "creation_mode")

    bind = op.get_bind()
    postgresql.ENUM(name="domain_event_status_enum").drop(
        bind, checkfirst=True
    )
    postgresql.ENUM(name="sales_order_status_enum").drop(
        bind, checkfirst=True
    )
