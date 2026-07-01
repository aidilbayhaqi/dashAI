from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.auth.schema_auth import AuthUserResponse, LoginResponse, TokenResponse
from src.modules.users.model_user import (
    User,
    UserCompanyAccess,
    UserRole,
    UserRolePermission,
    UserStatus,
)
from src.security.authentication.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from src.security.authentication.hash import verify_password
from src.security.redis.rate_limit import (
    check_login_rate_limit,
    increase_login_attempt,
    reset_login_attempt,
)
from src.security.authentication.token_store import (
    refresh_token_exists,
    revoke_refresh_token,
    store_refresh_token,
)


def build_permission_key(permission) -> str:
    return f"{permission.module_code}.{permission.feature_code}.{permission.action.value}"


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .where(User.email == email.lower())
            .options(
                selectinload(User.company_accesses)
                .selectinload(UserCompanyAccess.role)
                .selectinload(UserRole.permissions)
                .selectinload(UserRolePermission.permission),
                selectinload(User.company_accesses)
                .selectinload(UserCompanyAccess.branch_accesses),
            )
        )

        return result.scalar_one_or_none()

    async def login(
        self,
        *,
        email: str,
        password: str,
        company_id: UUID | None = None,
    ) -> LoginResponse:
        await check_login_rate_limit(email)

        user = await self._get_user_by_email(email)

        if not user or not verify_password(password, user.password_hash):
            await increase_login_attempt(email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not active",
            )

        active_accesses = [
            access
            for access in user.company_accesses
            if access.is_active
        ]

        selected_access = None

        if company_id:
            selected_access = next(
                (
                    access
                    for access in active_accesses
                    if access.company_id == company_id
                ),
                None,
            )

            if not selected_access and not user.is_superuser:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User has no access to this company",
                )

        elif active_accesses:
            selected_access = active_accesses[0]

        permissions: list[str] = []
        branch_ids: list[str] = []

        if selected_access and selected_access.role:
            for role_permission in selected_access.role.permissions:
                permission = role_permission.permission

                if permission and permission.is_active:
                    permissions.append(build_permission_key(permission))

            branch_ids = [
                str(branch_access.branch_id)
                for branch_access in selected_access.branch_accesses
            ]

        claims = {
            "email": user.email,
            "full_name": user.full_name,
            "is_superuser": user.is_superuser,
            "company_id": str(selected_access.company_id) if selected_access else None,
            "role_id": str(selected_access.role_id) if selected_access else None,
            "permissions": permissions,
            "branch_ids": branch_ids,
        }

        access_token = create_access_token(
            user_id=str(user.id),
            claims=claims,
        )

        refresh_token = create_refresh_token(
            user_id=str(user.id),
            claims={
                "company_id": claims["company_id"],
            },
        )

        refresh_payload = decode_token(refresh_token)
        await store_refresh_token(refresh_payload)

        user.last_login_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(user)

        await reset_login_attempt(email)

        return LoginResponse(
            user=AuthUserResponse(
                id=user.id,
                full_name=user.full_name,
                email=user.email,
                is_superuser=user.is_superuser,
                company_id=selected_access.company_id if selected_access else None,
                role_id=selected_access.role_id if selected_access else None,
                permissions=permissions,
                branch_ids=branch_ids,
            ),
            token=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
            ),
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        old_jti = payload["jti"]

        if not await refresh_token_exists(old_jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token revoked or expired",
            )

        user_id = payload["sub"]
        company_id = payload.get("company_id")

        await revoke_refresh_token(old_jti)

        user = await self.get_user_by_id(UUID(user_id))

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        # Reuse company context from old refresh token.
        access_result = await self.db.execute(
            select(UserCompanyAccess)
            .where(
                UserCompanyAccess.user_id == user.id,
                UserCompanyAccess.company_id == UUID(company_id) if company_id else False,
                UserCompanyAccess.is_active.is_(True),
            )
            .options(
                selectinload(UserCompanyAccess.role)
                .selectinload(UserRole.permissions)
                .selectinload(UserRolePermission.permission),
                selectinload(UserCompanyAccess.branch_accesses),
            )
        )

        selected_access = access_result.scalar_one_or_none() if company_id else None

        permissions: list[str] = []
        branch_ids: list[str] = []

        if selected_access and selected_access.role:
            for role_permission in selected_access.role.permissions:
                permission = role_permission.permission

                if permission and permission.is_active:
                    permissions.append(build_permission_key(permission))

            branch_ids = [
                str(branch_access.branch_id)
                for branch_access in selected_access.branch_accesses
            ]

        claims = {
            "email": user.email,
            "full_name": user.full_name,
            "is_superuser": user.is_superuser,
            "company_id": str(selected_access.company_id) if selected_access else None,
            "role_id": str(selected_access.role_id) if selected_access else None,
            "permissions": permissions,
            "branch_ids": branch_ids,
        }

        new_access_token = create_access_token(
            user_id=str(user.id),
            claims=claims,
        )

        new_refresh_token = create_refresh_token(
            user_id=str(user.id),
            claims={
                "company_id": claims["company_id"],
            },
        )

        new_refresh_payload = decode_token(new_refresh_token)
        await store_refresh_token(new_refresh_payload)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
        )

    async def get_user_by_id(self, user_id: UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()