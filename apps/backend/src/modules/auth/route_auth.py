from typing import Annotated

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from src.core.config import settings
from src.db.database import get_db
from src.modules.auth.schema_auth import (
    AuthUserResponse,
    LoginRequest,
    LoginResponse,
    RegisterCompanyOption,
    RegisterRequest,
    TokenResponse,
)
from src.modules.auth.service_auth import (
    AuthService,
)
from src.security.authentication.cookies import (
    clear_refresh_cookie,
    set_refresh_cookie,
    verify_trusted_origin,
)
from src.security.authentication.jwt import (
    decode_token,
)
from src.security.authentication.token_store import (
    revoke_refresh_token,
)
from src.security.dependencies import (
    CurrentUser,
    get_current_user,
    revoke_access_token_if_present,
)


router = APIRouter(
    prefix="/auth",
    tags=[
        "Authentication"
    ],
)


@router.get(
    "/register/companies",
    response_model=list[
        RegisterCompanyOption
    ],
)
async def get_register_companies(
    search: str | None = Query(
        default=None,
        max_length=100,
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    service = AuthService(db)

    return await (
        service
        .get_register_companies(
            search=search
        )
    )


@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(
        get_db
    ),
):
    verify_trusted_origin(
        request
    )

    service = AuthService(db)

    result = await service.register(
        payload
    )

    refresh_token = (
        result
        .token
        .refresh_token
    )

    if not refresh_token:
        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Refresh session "
                "gagal dibuat"
            ),
        )

    set_refresh_cookie(
        response,
        refresh_token,
    )

    return result


@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(
        get_db
    ),
):
    verify_trusted_origin(
        request
    )

    service = AuthService(db)

    result = await service.login(
        email=payload.email,
        password=payload.password,
        company_id=(
            payload.company_id
        ),
    )

    refresh_token = (
        result
        .token
        .refresh_token
    )

    if not refresh_token:
        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Refresh session "
                "gagal dibuat"
            ),
        )

    set_refresh_cookie(
        response,
        refresh_token,
    )

    return result


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh_token(
    request: Request,
    response: Response,

    refresh_cookie: Annotated[
        str | None,
        Cookie(
            alias=(
                settings
                .REFRESH_COOKIE_NAME
            ),
        ),
    ] = None,

    db: AsyncSession = Depends(
        get_db
    ),
):
    verify_trusted_origin(
        request
    )

    if not refresh_cookie:
        clear_refresh_cookie(
            response
        )

        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Missing refresh session"
            ),
        )

    service = AuthService(db)

    try:
        result = await service.refresh(
            refresh_cookie
        )

    except HTTPException:
        clear_refresh_cookie(
            response
        )

        raise

    new_refresh_token = (
        result.refresh_token
    )

    if not new_refresh_token:
        clear_refresh_cookie(
            response
        )

        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Refresh session "
                "gagal dirotasi"
            ),
        )

    set_refresh_cookie(
        response,
        new_refresh_token,
    )

    return result


@router.post(
    "/logout",
    status_code=(
        status.HTTP_200_OK
    ),
)
async def logout(
    request: Request,
    response: Response,

    refresh_cookie: Annotated[
        str | None,
        Cookie(
            alias=(
                settings
                .REFRESH_COOKIE_NAME
            ),
        ),
    ] = None,

    _: bool = Depends(
        revoke_access_token_if_present
    ),
):
    verify_trusted_origin(
        request
    )

    if refresh_cookie:
        try:
            refresh_payload = (
                decode_token(
                    refresh_cookie
                )
            )

            if (
                refresh_payload.get(
                    "type"
                )
                == "refresh"
                and refresh_payload.get(
                    "jti"
                )
            ):
                await (
                    revoke_refresh_token(
                        str(
                            refresh_payload[
                                "jti"
                            ]
                        )
                    )
                )

        except Exception:
            # Cookie tetap dibersihkan
            # meskipun token sudah invalid.
            pass

    clear_refresh_cookie(
        response
    )

    return {
        "success": True,
        "message": (
            "Logged out successfully"
        ),
    }


@router.get(
    "/me",
    response_model=(
        AuthUserResponse
    ),
)
async def me(
    current_user: (
        CurrentUser
    ) = Depends(
        get_current_user
    ),
):
    return AuthUserResponse(
        id=(
            current_user
            .user_id
        ),

        full_name=(
            current_user
            .full_name
        ),

        email=(
            current_user.email
        ),

        is_superuser=(
            current_user
            .is_superuser
        ),

        is_owner=(
            current_user
            .is_owner
        ),

        company_id=(
            current_user
            .company_id
        ),

        role_id=(
            current_user.role_id
        ),

        default_branch_id=(
            current_user.default_branch_id
        ),

        permissions=(
            current_user
            .permissions
        ),

        branch_ids=(
            current_user
            .branch_ids
        ),
    )