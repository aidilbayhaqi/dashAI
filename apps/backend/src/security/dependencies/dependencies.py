from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
    permissions: list[str]
    branch_ids: list[str]
    token_payload: dict
    raw_token: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    jti = payload.get("jti")

    if not jti or await is_access_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revoked",
        )

    return CurrentUser(
        user_id=UUID(payload["sub"]),
        email=payload.get("email", ""),
        full_name=payload.get("full_name", ""),
        is_superuser=bool(payload.get("is_superuser", False)),
        company_id=UUID(payload["company_id"]) if payload.get("company_id") else None,
        role_id=UUID(payload["role_id"]) if payload.get("role_id") else None,
        permissions=payload.get("permissions", []),
        branch_ids=payload.get("branch_ids", []),
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
):
    await blacklist_access_token(current_user.token_payload)
    return True