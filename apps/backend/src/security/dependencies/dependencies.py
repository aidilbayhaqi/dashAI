from dataclasses import dataclass
from uuid import UUID

from fastapi import (
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from src.security.authentication.jwt import (
    decode_token,
)
from src.security.authentication.token_store import (
    blacklist_access_token,
    is_access_token_blacklisted,
)


bearer_scheme = HTTPBearer(
    auto_error=False
)


@dataclass
class CurrentUser:
    user_id: UUID
    email: str
    full_name: str
    is_superuser: bool

    company_id: (
        UUID | None
    )

    role_id: (
        UUID | None
    )

    permissions: list[str]
    branch_ids: list[str]

    token_payload: dict
    raw_token: str


async def get_current_user(
    credentials: (
        HTTPAuthorizationCredentials
        | None
    ) = Depends(
        bearer_scheme
    ),
) -> CurrentUser:
    if not credentials:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Missing authorization token"
            ),
        )

    token = (
        credentials.credentials
    )

    try:
        payload = decode_token(
            token
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail="Invalid token",
        ) from exc

    if (
        payload.get("type")
        != "access"
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail="Invalid token type",
        )

    jti = payload.get("jti")

    if (
        not jti
        or await
        is_access_token_blacklisted(
            str(jti)
        )
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail="Token revoked",
        )

    try:
        user_id = UUID(
            str(payload["sub"])
        )

        company_id = (
            UUID(
                str(
                    payload[
                        "company_id"
                    ]
                )
            )
            if payload.get(
                "company_id"
            )
            else None
        )

        role_id = (
            UUID(
                str(
                    payload[
                        "role_id"
                    ]
                )
            )
            if payload.get(
                "role_id"
            )
            else None
        )

    except (
        KeyError,
        TypeError,
        ValueError,
    ) as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid token claims"
            ),
        ) from exc

    permissions = payload.get(
        "permissions",
        [],
    )

    branch_ids = payload.get(
        "branch_ids",
        [],
    )

    if (
        not isinstance(
            permissions,
            list,
        )
        or not isinstance(
            branch_ids,
            list,
        )
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid authorization claims"
            ),
        )

    return CurrentUser(
        user_id=user_id,

        email=str(
            payload.get(
                "email",
                "",
            )
        ),

        full_name=str(
            payload.get(
                "full_name",
                "",
            )
        ),

        is_superuser=bool(
            payload.get(
                "is_superuser",
                False,
            )
        ),

        company_id=company_id,
        role_id=role_id,

        permissions=[
            str(item)
            for item
            in permissions
        ],

        branch_ids=[
            str(item)
            for item
            in branch_ids
        ],

        token_payload=payload,
        raw_token=token,
    )


def require_permission(
    permission: str,
):
    async def dependency(
        current_user: (
            CurrentUser
        ) = Depends(
            get_current_user
        ),
    ) -> CurrentUser:
        if (
            current_user
            .is_superuser
        ):
            return current_user

        if (
            permission
            not in
            current_user.permissions
        ):
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Permission denied: "
                    f"{permission}"
                ),
            )

        return current_user

    return dependency


async def revoke_current_access_token(
    current_user: (
        CurrentUser
    ) = Depends(
        get_current_user
    ),
) -> bool:
    await blacklist_access_token(
        current_user.token_payload
    )

    return True


async def revoke_access_token_if_present(
    credentials: (
        HTTPAuthorizationCredentials
        | None
    ) = Depends(
        bearer_scheme
    ),
) -> bool:
    """
    Logout tetap dapat dilakukan ketika
    access token tidak tersedia atau sudah
    kedaluwarsa.

    Jika access token masih valid, token
    tersebut akan masuk blacklist Redis.
    """

    if not credentials:
        return False

    try:
        payload = decode_token(
            credentials.credentials
        )

    except ValueError:
        return False

    if (
        payload.get("type")
        != "access"
    ):
        return False

    jti = payload.get("jti")

    if not jti:
        return False

    await blacklist_access_token(
        payload
    )

    return True