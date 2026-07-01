from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.auth.schema_auth import (
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    RefreshTokenRequest,
    TokenResponse,
    AuthUserResponse,
)
from src.modules.auth.service_auth import AuthService
from src.security.dependencies import (
    CurrentUser,
    get_current_user,
    revoke_current_access_token,
)
from src.security.authentication.jwt import decode_token
from src.security.authentication.token_store import revoke_refresh_token


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)

    return await service.login(
        email=payload.email,
        password=payload.password,
        company_id=payload.company_id,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)

    return await service.refresh(payload.refresh_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    payload: LogoutRequest,
    _: bool = Depends(revoke_current_access_token),
):
    if payload.refresh_token:
        try:
            refresh_payload = decode_token(payload.refresh_token)

            if refresh_payload.get("type") == "refresh":
                await revoke_refresh_token(refresh_payload["jti"])

        except Exception:
            pass

    return {
        "success": True,
        "message": "Logged out successfully",
    }


@router.get("/me", response_model=AuthUserResponse)
async def me(
    current_user: CurrentUser = Depends(get_current_user),
):
    return AuthUserResponse(
        id=current_user.user_id,
        full_name=current_user.full_name,
        email=current_user.email,
        is_superuser=current_user.is_superuser,
        company_id=current_user.company_id,
        role_id=current_user.role_id,
        permissions=current_user.permissions,
        branch_ids=current_user.branch_ids,
    )