from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.database import get_db
from src.modules.company.model_company import CompanyStatus
from src.modules.users.model_user import (
    AccessScope,
    User,
    UserCompanyAccess,
    UserRole,
    UserRolePermission,
    UserStatus,
)
from src.security.authentication.jwt import decode_token
from src.security.authentication.token_store import (
    blacklist_access_token,
    is_access_token_blacklisted,
)


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    user_id: UUID
    email: str
    full_name: str
    is_superuser: bool

    company_id: UUID | None
    role_id: UUID | None
    default_branch_id: UUID | None

    access_scope: str
    permissions: list[str]
    branch_ids: list[str]

    token_payload: dict
    raw_token: str

    @property
    def has_selected_branch_scope(self) -> bool:
        return self.access_scope == AccessScope.SELECTED_BRANCHES.value

    @property
    def allowed_branch_ids(self) -> set[UUID] | None:
        """
        None berarti akses branch tidak dibatasi.
        Set kosong berarti scope selected_branches tetapi belum
        memiliki branch yang diizinkan.
        """

        if self.is_superuser or not self.has_selected_branch_scope:
            return None

        allowed: set[UUID] = set()

        for branch_id in self.branch_ids:
            try:
                allowed.add(UUID(str(branch_id)))
            except (TypeError, ValueError):
                continue

        return allowed


def _build_permission_key(role_permission: UserRolePermission) -> str | None:
    permission = role_permission.permission

    if permission is None or not permission.is_active:
        return None

    action = getattr(
        permission.action,
        "value",
        permission.action,
    )

    return (
        f"{permission.module_code}."
        f"{permission.feature_code}."
        f"{action}"
    )


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not credentials:
        raise _unauthorized("Missing authorization token")

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise _unauthorized("Invalid token") from exc

    if payload.get("type") != "access":
        raise _unauthorized("Invalid token type")

    jti = payload.get("jti")

    if not jti or await is_access_token_blacklisted(str(jti)):
        raise _unauthorized("Token revoked")

    try:
        user_id = UUID(str(payload["sub"]))

        token_company_id = (
            UUID(str(payload["company_id"]))
            if payload.get("company_id")
            else None
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise _unauthorized("Invalid token claims") from exc

    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()

    if user is None or user.status != UserStatus.ACTIVE:
        raise _unauthorized("User session is no longer active")

    # Superuser tetap diverifikasi dari database, bukan dari claim JWT.
    if user.is_superuser:
        return CurrentUser(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_superuser=True,
            company_id=token_company_id,
            role_id=None,
            default_branch_id=None,
            access_scope=AccessScope.COMPANY.value,
            permissions=[],
            branch_ids=[],
            token_payload=payload,
            raw_token=token,
        )

    if token_company_id is None:
        raise _unauthorized("Missing company context")

    access_result = await db.execute(
        select(UserCompanyAccess)
        .where(
            UserCompanyAccess.user_id == user.id,
            UserCompanyAccess.company_id == token_company_id,
            UserCompanyAccess.is_active.is_(True),
        )
        .options(
            selectinload(UserCompanyAccess.company),
            selectinload(UserCompanyAccess.branch_accesses),
            selectinload(UserCompanyAccess.role)
            .selectinload(UserRole.permissions)
            .selectinload(UserRolePermission.permission),
        )
    )
    access = access_result.scalar_one_or_none()

    if access is None:
        raise _unauthorized("Company access is no longer active")

    if (
        access.company is None
        or not access.company.is_active
        or access.company.status != CompanyStatus.ACTIVE
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company is not active",
        )

    if access.role is None or not access.role.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role is not active",
        )

    permissions: list[str] = []

    for role_permission in access.role.permissions:
        permission_key = _build_permission_key(role_permission)

        if permission_key:
            permissions.append(permission_key)

    branch_ids = [
        str(branch_access.branch_id)
        for branch_access in access.branch_accesses
    ]

    access_scope = getattr(
        access.access_scope,
        "value",
        access.access_scope,
    )

    return CurrentUser(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_superuser=False,
        company_id=access.company_id,
        role_id=access.role_id,
        default_branch_id=access.default_branch_id,
        access_scope=str(access_scope),
        permissions=permissions,
        branch_ids=branch_ids,
        token_payload=payload,
        raw_token=token,
    )


def require_permission(permission: str):
    async def dependency(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if current_user.is_superuser:
            return current_user

        if permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}",
            )

        return current_user

    return dependency


async def revoke_current_access_token(
    current_user: CurrentUser = Depends(get_current_user),
) -> bool:
    await blacklist_access_token(current_user.token_payload)
    return True


async def revoke_access_token_if_present(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> bool:
    if not credentials:
        return False

    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        return False

    if payload.get("type") != "access" or not payload.get("jti"):
        return False

    await blacklist_access_token(payload)
    return True
