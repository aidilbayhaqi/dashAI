"""problem 5 idempotency and domain integrity

Revision ID: 5d9a1c7e4b20
Revises: 959810c0f3b0
Create Date: 2026-07-09 13:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5d9a1c7e4b20"
down_revision: Union[str, Sequence[str], None] = "959810c0f3b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _raise_when_duplicate_exists(
    *,
    query: str,
    message: str,
) -> None:
    bind = op.get_bind()
    duplicate = bind.execute(sa.text(query)).first()

    if duplicate is not None:
        raise RuntimeError(message)


def upgrade() -> None:
    _raise_when_duplicate_exists(
        query="""
            SELECT
                company_id,
                employee_id,
                period_start,
                period_end,
                COUNT(*) AS duplicate_count
            FROM hr_kpi_reviews
            GROUP BY
                company_id,
                employee_id,
                period_start,
                period_end
            HAVING COUNT(*) > 1
            LIMIT 1
        """,
        message=(
            "Duplicate KPI reviews exist. Resolve duplicate records for the "
            "same company, employee and period before running this migration."
        ),
    )

    _raise_when_duplicate_exists(
        query="""
            SELECT
                company_id,
                source_module,
                source_id,
                product_id,
                branch_id,
                COUNT(*) AS duplicate_count
            FROM product_stock_movements
            WHERE source_id IS NOT NULL
            GROUP BY
                company_id,
                source_module,
                source_id,
                product_id,
                branch_id
            HAVING COUNT(*) > 1
            LIMIT 1
        """,
        message=(
            "Duplicate stock movement sources exist. Resolve duplicate "
            "source records before running this migration."
        ),
    )

    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS
                uq_kpi_review_company_employee_period
            ON hr_kpi_reviews (
                company_id,
                employee_id,
                period_start,
                period_end
            )
            """
        )
    )

    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS
                uq_stock_movement_source
            ON product_stock_movements (
                company_id,
                source_module,
                source_id,
                product_id,
                branch_id
            )
            WHERE source_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DROP INDEX IF EXISTS uq_stock_movement_source"
        )
    )
    op.execute(
        sa.text(
            "DROP INDEX IF EXISTS "
            "uq_kpi_review_company_employee_period"
        )
    )
