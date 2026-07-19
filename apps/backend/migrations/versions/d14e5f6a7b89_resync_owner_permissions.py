"""Resync owner permissions for existing production accounts.

Revision ID: d14e5f6a7b89
Revises: c03d4e5f6a78
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d14e5f6a7b89"
down_revision: Union[str, Sequence[str], None] = "c03d4e5f6a78"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Normalize legacy owner roles first. This remains company-scoped because
    # every role row keeps its original company_id.
    op.execute(
        """
        UPDATE user_roles
        SET is_owner_role = TRUE,
            is_active = TRUE
        WHERE LOWER(code) = 'owner'
        """
    )

    # Owner and administrator roles receive every active permission currently
    # present in the canonical catalog. The unique key makes this idempotent.
    op.execute(
        """
        INSERT INTO user_role_permissions (
            id, role_id, permission_id, created_at
        )
        SELECT
            gen_random_uuid(),
            role.id,
            permission.id,
            NOW()
        FROM user_roles AS role
        CROSS JOIN user_permissions AS permission
        WHERE role.is_active = TRUE
          AND permission.is_active = TRUE
          AND (
              role.is_owner_role = TRUE
              OR LOWER(role.code) IN ('owner', 'admin')
          )
        ON CONFLICT (role_id, permission_id) DO NOTHING
        """
    )

    # Repair owner access without ever moving access to another company.
    op.execute(
        """
        UPDATE user_company_accesses AS access
        SET is_owner = TRUE,
            access_scope = 'ALL_BRANCHES'::user_access_scope_enum,
            updated_at = NOW()
        FROM user_roles AS role
        WHERE access.role_id = role.id
          AND access.company_id = role.company_id
          AND access.is_active = TRUE
          AND (
              role.is_owner_role = TRUE
              OR LOWER(role.code) = 'owner'
          )
        """
    )


def downgrade() -> None:
    # Access grants are retained to avoid locking existing production owners
    # out of their own tenant after a rollback.
    pass
