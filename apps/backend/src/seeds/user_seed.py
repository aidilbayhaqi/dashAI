from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.users.model_user import (
    PermissionAction,
    User,
    UserBranchAccess,
    UserCompanyAccess,
    UserPermission,
    UserRole,
    UserRolePermission,
    UserStatus,
)
from src.seeds.context import CompanySeedContext
from src.seeds.data import (
    COMPANY_LABELS,
    PERMISSION_MATRIX,
    ROLE_ALLOWED_MODULES,
    ROLES,
    USERS,
)
from src.seeds.utils import add_if_missing, add_many_if_missing, seed_password_hash, sid


async def seed_users_and_access(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
) -> dict[str, uuid.UUID]:
    password_hash = seed_password_hash("admin123")

    superuser_id = sid("user:system:superadmin")

    await add_if_missing(
        db,
        User(
            id=superuser_id,
            full_name="System Superadmin",
            email="superadmin@dashai.test",
            phone="+62-800-0000-0001",
            password_hash=password_hash,
            status=UserStatus.ACTIVE,
            is_superuser=True,
        ),
    )

    permissions = []

    for module_code, features in PERMISSION_MATRIX.items():
        for feature_code in features:
            for action in PermissionAction:
                permissions.append(
                    UserPermission(
                        id=sid(f"permission:{module_code}:{feature_code}:{action.value}"),
                        module_code=module_code,
                        feature_code=feature_code,
                        action=action,
                        name=f"{module_code}.{feature_code}.{action.value}",
                        description=f"{action.value} permission untuk {module_code}.{feature_code}",
                        is_active=True,
                    )
                )

    await add_many_if_missing(db, permissions)
    await db.flush()

    for ctx in contexts.values():
        role_objects = []

        for role in ROLES:
            role_objects.append(
                UserRole(
                    id=ctx.role_ids[role["key"]],
                    company_id=ctx.company_id,
                    code=role["code"],
                    name=role["name"],
                    description=role["description"],
                    is_owner_role=role["is_owner_role"],
                    is_system_role=role["is_system_role"],
                    is_active=True,
                )
            )

        await add_many_if_missing(db, role_objects)
        await db.flush()

        role_permission_objects = []

        for role in ROLES:
            role_key = role["key"]
            allowed_modules = ROLE_ALLOWED_MODULES[role_key]

            for module_code, features in PERMISSION_MATRIX.items():
                if module_code not in allowed_modules:
                    continue

                for feature_code in features:
                    for action in PermissionAction:
                        permission_id = sid(
                            f"permission:{module_code}:{feature_code}:{action.value}"
                        )

                        role_permission_objects.append(
                            UserRolePermission(
                                id=sid(
                                    f"role-permission:{ctx.code}:{role_key}:{module_code}:{feature_code}:{action.value}"
                                ),
                                role_id=ctx.role_ids[role_key],
                                permission_id=permission_id,
                            )
                        )

        await add_many_if_missing(db, role_permission_objects)
        await db.flush()

        user_objects = []
        company_access_objects = []
        branch_access_objects = []

        for user in USERS:
            user_key = user["key"]
            user_id = ctx.user_ids[user_key]

            user_objects.append(
                User(
                    id=user_id,
                    full_name=user["full_name"].format(
    company=ctx.code,
    company_label=COMPANY_LABELS.get(ctx.code, ctx.code.upper()),
),
                    email=user["email"].format(company=ctx.code),
                    phone=user["phone"],
                    password_hash=password_hash,
                    status=UserStatus.ACTIVE,
                    is_superuser=False,
                )
            )

        await add_many_if_missing(db, user_objects)
        await db.flush()

        for user in USERS:
            user_key = user["key"]
            default_branch_key = user["default_branch"]
            company_access_id = sid(f"company-access:{ctx.code}:{user_key}")

            company_access_objects.append(
                UserCompanyAccess(
                    id=company_access_id,
                    user_id=ctx.user_ids[user_key],
                    company_id=ctx.company_id,
                    role_id=ctx.role_ids[user["role"]],
                    default_branch_id=ctx.branch_ids[default_branch_key],
                    access_scope=user["access_scope"],
                    job_title=user["job_title"],
                    department_name=user["department_name"],
                    is_owner=user["is_owner"],
                    is_active=True,
                    invited_at=datetime.utcnow(),
                    joined_at=datetime.utcnow(),
                )
            )

            if user["access_scope"].value == "all_branches":
                allowed_branch_keys = list(ctx.branch_ids.keys())
            else:
                allowed_branch_keys = [default_branch_key]

            for branch_key in allowed_branch_keys:
                branch_access_objects.append(
                    UserBranchAccess(
                        id=sid(f"branch-access:{ctx.code}:{user_key}:{branch_key}"),
                        company_access_id=company_access_id,
                        branch_id=ctx.branch_ids[branch_key],
                        can_manage_branch=user_key in {"owner", "admin", "warehouse"},
                        is_default=branch_key == default_branch_key,
                    )
                )

        await add_many_if_missing(db, company_access_objects)
        await db.flush()

        await add_many_if_missing(db, branch_access_objects)

    await db.flush()

    return {"superuser": superuser_id}