from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.users.model_user import (
    PermissionAction,
    UserCompanyAccess,
    UserPermission,
)


# Runtime source of truth. Production registration must not depend on the
# optional demo seed to create permissions.
PERMISSION_MATRIX: dict[str, tuple[str, ...]] = {
    "company": ("profile", "branches"),
    "users": ("users", "roles", "permissions", "access"),
    "finance": (
        "accounts",
        "transactions",
        "journals",
        "reports",
        "tax-rates",
        "cash-accounts",
        "budgets",
        "snapshots",
        "invoices",
    ),
    "products": ("categories", "products", "stock", "movements", "suppliers"),
    "hr": ("employees", "attendance", "leave", "tasks", "kpi", "payroll"),
    "crm": ("leads", "contacts", "deals", "activities", "campaigns"),
    "admin": ("settings",),
    "dashboard": ("summary",),
    "realtime": ("events",),
    "ai": ("reports", "analytics"),
}


def iter_permission_specs() -> Iterable[tuple[str, str, PermissionAction]]:
    for module_code, features in PERMISSION_MATRIX.items():
        for feature_code in features:
            for action in PermissionAction:
                yield module_code, feature_code, action


def build_permission_key(
    module_code: str,
    feature_code: str,
    action: PermissionAction | str,
) -> str:
    action_value = getattr(action, "value", action)
    return f"{module_code}.{feature_code}.{action_value}"


ALL_PERMISSION_KEYS: tuple[str, ...] = tuple(
    build_permission_key(module_code, feature_code, action)
    for module_code, feature_code, action in iter_permission_specs()
)

VIEW_PERMISSION_KEYS: tuple[str, ...] = tuple(
    permission
    for permission in ALL_PERMISSION_KEYS
    if permission.endswith(".view")
)


def is_owner_company_access(access: UserCompanyAccess | None) -> bool:
    if access is None:
        return False

    role = access.role
    role_code = str(getattr(role, "code", "") or "").strip().lower()

    return bool(
        access.is_owner
        or getattr(role, "is_owner_role", False)
        or role_code == "owner"
    )


async def ensure_permission_catalog(
    db: AsyncSession,
) -> list[UserPermission]:
    """Upsert the complete permission catalog without requiring demo seed."""

    existing_result = await db.execute(select(UserPermission))
    existing_permissions = list(existing_result.scalars().all())
    existing_by_key = {
        (
            permission.module_code,
            permission.feature_code,
            getattr(permission.action, "value", permission.action),
        ): permission
        for permission in existing_permissions
    }

    for module_code, feature_code, action in iter_permission_specs():
        natural_key = (module_code, feature_code, action.value)
        existing = existing_by_key.get(natural_key)

        if existing is not None:
            if not existing.is_active:
                existing.is_active = True
            continue

        permission = UserPermission(
            module_code=module_code,
            feature_code=feature_code,
            action=action,
            name=build_permission_key(module_code, feature_code, action),
            description=(
                f"{action.value} permission untuk "
                f"{module_code}.{feature_code}"
            ),
            is_active=True,
        )
        db.add(permission)
        existing_permissions.append(permission)

    await db.flush()

    result = await db.execute(
        select(UserPermission)
        .where(UserPermission.is_active.is_(True))
        .order_by(
            UserPermission.module_code.asc(),
            UserPermission.feature_code.asc(),
            UserPermission.action.asc(),
        )
    )
    return list(result.scalars().all())
