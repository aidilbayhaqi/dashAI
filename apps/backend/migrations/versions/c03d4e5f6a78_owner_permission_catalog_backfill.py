"""Backfill production permission catalog and owner/admin access.

Revision ID: c03d4e5f6a78
Revises: bf2a3b4c5d67
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c03d4e5f6a78"
down_revision: Union[str, Sequence[str], None] = "bf2a3b4c5d67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PERMISSION_MATRIX = {
    "company": ("profile", "branches"),
    "users": ("users", "roles", "permissions", "access"),
    "finance": (
        "accounts", "transactions", "journals", "reports", "tax-rates",
        "cash-accounts", "budgets", "snapshots", "invoices",
    ),
    "products": ("categories", "products", "stock", "movements", "suppliers"),
    "hr": ("employees", "attendance", "leave", "tasks", "kpi", "payroll"),
    "crm": ("leads", "contacts", "deals", "activities", "campaigns"),
    "admin": ("settings",),
    "dashboard": ("summary",),
    "realtime": ("events",),
    "ai": ("reports", "analytics"),
}

ACTIONS = ("view", "create", "update", "delete", "approve", "export", "manage")


def _sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def upgrade() -> None:
    values: list[str] = []

    for module_code, features in PERMISSION_MATRIX.items():
        for feature_code in features:
            for action in ACTIONS:
                key = f"{module_code}.{feature_code}.{action}"
                description = f"{action} permission untuk {module_code}.{feature_code}"
                values.append(
                    "(" + ", ".join(
                        [
                            "gen_random_uuid()",
                            _sql_literal(module_code),
                            _sql_literal(feature_code),
                            f"{_sql_literal(action.upper())}::user_permission_action_enum",
                            _sql_literal(key),
                            _sql_literal(description),
                            "TRUE",
                            "NOW()",
                        ]
                    ) + ")"
                )

    op.execute(
        """
        INSERT INTO user_permissions (
            id, module_code, feature_code, action, name,
            description, is_active, created_at
        ) VALUES
        """
        + ",\n".join(values)
        + """
        ON CONFLICT (module_code, feature_code, action)
        DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            is_active = TRUE
        """
    )

    # Existing owner and administrator roles receive the complete active
    # permission catalog. Tenant isolation is still enforced by company_id.
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

    # Repair legacy owner access rows where the role flag or access flag was
    # incomplete, while never changing company ownership across tenants.
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
    # Permission rows are intentionally retained because deleting them could
    # invalidate active production roles and audit history.
    pass
