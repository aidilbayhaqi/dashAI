from uuid import UUID

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.time import utc_now_naive
from src.modules.users.model_user import (
    AccessScope,
    User,
    UserBranchAccess,
    UserCompanyAccess,
    UserPermission,
    UserRole,
    UserRolePermission,
)
from src.modules.users.schema_user import (
    AssignPermissionToRoleCreate,
    PermissionCheckRequest,
    UserBranchAccessCreate,
    UserCompanyAccessCreate,
    UserCompanyAccessUpdate,
    UserCreate,
    UserPermissionCreate,
    UserPermissionUpdate,
    UserRoleCreate,
    UserRoleUpdate,
    UserUpdate,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    async def create_user(self, payload: UserCreate):
        data = payload.model_dump(exclude={"password"})

        if payload.password:
            data["password_hash"] = self.hash_password(payload.password)

        user = User(**data)

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def get_users(self):
        result = await self.db.execute(
            select(User).order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_user_by_id(self, user_id: UUID):
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_user(self, user_id: UUID, payload: UserUpdate):
        user = await self.get_user_by_id(user_id)

        if user is None:
            return None

        data = payload.model_dump(exclude_unset=True, exclude={"password"})

        if payload.password:
            data["password_hash"] = self.hash_password(payload.password)

        for field, value in data.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def delete_user(self, user_id: UUID) -> bool:
        user = await self.get_user_by_id(user_id)

        if user is None:
            return False

        await self.db.delete(user)
        await self.db.commit()

        return True

    async def create_role(self, payload: UserRoleCreate):
        role = UserRole(**payload.model_dump())

        self.db.add(role)
        await self.db.commit()
        await self.db.refresh(role)

        return role

    async def get_roles(self, company_id: UUID):
        result = await self.db.execute(
            select(UserRole)
            .where(UserRole.company_id == company_id)
            .order_by(UserRole.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_role(self, role_id: UUID, payload: UserRoleUpdate):
        result = await self.db.execute(
            select(UserRole).where(UserRole.id == role_id)
        )
        role = result.scalar_one_or_none()

        if role is None:
            return None

        data = payload.model_dump(exclude_unset=True)

        for field, value in data.items():
            setattr(role, field, value)

        await self.db.commit()
        await self.db.refresh(role)

        return role

    async def create_permission(self, payload: UserPermissionCreate):
        permission = UserPermission(**payload.model_dump())

        self.db.add(permission)
        await self.db.commit()
        await self.db.refresh(permission)

        return permission

    async def get_permissions(self):
        result = await self.db.execute(
            select(UserPermission).order_by(
                UserPermission.module_code.asc(),
                UserPermission.feature_code.asc(),
                UserPermission.action.asc(),
            )
        )
        return list(result.scalars().all())

    async def update_permission(self, permission_id: UUID, payload: UserPermissionUpdate):
        result = await self.db.execute(
            select(UserPermission).where(UserPermission.id == permission_id)
        )
        permission = result.scalar_one_or_none()

        if permission is None:
            return None

        data = payload.model_dump(exclude_unset=True)

        for field, value in data.items():
            setattr(permission, field, value)

        await self.db.commit()
        await self.db.refresh(permission)

        return permission

    async def assign_permission_to_role(
        self,
        role_id: UUID,
        payload: AssignPermissionToRoleCreate,
    ):
        role_permission = UserRolePermission(
            role_id=role_id,
            permission_id=payload.permission_id,
        )

        self.db.add(role_permission)
        await self.db.commit()
        await self.db.refresh(role_permission)

        return role_permission

    async def create_company_access(self, payload: UserCompanyAccessCreate):
        access = UserCompanyAccess(
            invited_at=utc_now_naive(),
            joined_at=utc_now_naive(),
            **payload.model_dump(),
        )

        self.db.add(access)
        await self.db.commit()
        await self.db.refresh(access)

        return access

    async def get_company_accesses(
        self,
        *,
        company_id: UUID | None = None,
        user_id: UUID | None = None,
    ):
        query = (
            select(UserCompanyAccess)
            .options(
                selectinload(UserCompanyAccess.user),
                selectinload(UserCompanyAccess.role),
                selectinload(UserCompanyAccess.branch_accesses),
            )
            .order_by(UserCompanyAccess.created_at.desc())
        )

        if company_id:
            query = query.where(UserCompanyAccess.company_id == company_id)

        if user_id:
            query = query.where(UserCompanyAccess.user_id == user_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_company_access(
        self,
        access_id: UUID,
        payload: UserCompanyAccessUpdate,
    ):
        result = await self.db.execute(
            select(UserCompanyAccess).where(UserCompanyAccess.id == access_id)
        )
        access = result.scalar_one_or_none()

        if access is None:
            return None

        data = payload.model_dump(exclude_unset=True)

        for field, value in data.items():
            setattr(access, field, value)

        await self.db.commit()
        await self.db.refresh(access)

        return access

    async def create_branch_access(self, payload: UserBranchAccessCreate):
        branch_access = UserBranchAccess(**payload.model_dump())

        self.db.add(branch_access)
        await self.db.commit()
        await self.db.refresh(branch_access)

        return branch_access

    async def get_user_permissions(
        self,
        *,
        user_id: UUID,
        company_id: UUID,
    ):
        result = await self.db.execute(
            select(UserCompanyAccess)
            .where(
                UserCompanyAccess.user_id == user_id,
                UserCompanyAccess.company_id == company_id,
                UserCompanyAccess.is_active.is_(True),
            )
            .options(
                selectinload(UserCompanyAccess.role)
                .selectinload(UserRole.permissions)
                .selectinload(UserRolePermission.permission)
            )
        )

        access = result.scalar_one_or_none()

        if access is None:
            return []

        permissions = []

        for role_permission in access.role.permissions:
            permission = role_permission.permission

            if permission and permission.is_active:
                permissions.append(permission)

        return permissions

    async def user_has_permission(
        self,
        payload: PermissionCheckRequest,
    ) -> tuple[bool, str]:
        result = await self.db.execute(
            select(User).where(User.id == payload.user_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            return False, "User not found"

        if user.is_superuser:
            return True, "User is superuser"

        access_result = await self.db.execute(
            select(UserCompanyAccess)
            .where(
                UserCompanyAccess.user_id == payload.user_id,
                UserCompanyAccess.company_id == payload.company_id,
                UserCompanyAccess.is_active.is_(True),
            )
            .options(
                selectinload(UserCompanyAccess.role)
                .selectinload(UserRole.permissions)
                .selectinload(UserRolePermission.permission),
                selectinload(UserCompanyAccess.branch_accesses),
            )
        )

        access = access_result.scalar_one_or_none()

        if access is None:
            return False, "User has no company access"

        if access.access_scope == AccessScope.SELECTED_BRANCHES:
            if payload.branch_id is None:
                return False, "Branch is required for selected branch access"

            allowed_branch_ids = {
                branch_access.branch_id
                for branch_access in access.branch_accesses
            }

            if payload.branch_id not in allowed_branch_ids:
                return False, "User has no access to this branch"

        for role_permission in access.role.permissions:
            permission = role_permission.permission

            if not permission or not permission.is_active:
                continue

            if (
                permission.module_code == payload.module_code
                and permission.feature_code == payload.feature_code
                and permission.action == payload.action
            ):
                return True, "Permission granted"

        return False, "Permission denied"