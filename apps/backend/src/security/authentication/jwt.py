import uuid
from datetime import (
    datetime,
    timedelta,
    timezone,
)
from typing import Any

from jose import JWTError, jwt

from src.core.config import settings


def utc_now() -> datetime:
    return datetime.now(
        timezone.utc
    )


def create_token(
    *,
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: (
        dict[str, Any]
        | None
    ) = None,
) -> str:
    now = utc_now()
    expire = now + expires_delta

    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(
            now.timestamp()
        ),
        "nbf": int(
            now.timestamp()
        ),
        "exp": int(
            expire.timestamp()
        ),
        "jti": str(
            uuid.uuid4()
        ),
        "iss": (
            settings.JWT_ISSUER
        ),
        "aud": (
            settings.JWT_AUDIENCE
        ),
    }

    if extra_claims:
        payload.update(
            extra_claims
        )

    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=(
            settings.JWT_ALGORITHM
        ),
    )


def create_access_token(
    *,
    user_id: str,
    claims: dict[str, Any],
) -> str:
    return create_token(
        subject=user_id,
        token_type="access",
        expires_delta=timedelta(
            minutes=(
                settings
                .ACCESS_TOKEN_EXPIRE_MINUTES
            )
        ),
        extra_claims=claims,
    )


def create_refresh_token(
    *,
    user_id: str,
    claims: (
        dict[str, Any]
        | None
    ) = None,
) -> str:
    return create_token(
        subject=user_id,
        token_type="refresh",
        expires_delta=timedelta(
            days=(
                settings
                .REFRESH_TOKEN_EXPIRE_DAYS
            )
        ),
        extra_claims=(
            claims or {}
        ),
    )


def decode_token(
    token: str,
) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[
                settings.JWT_ALGORITHM
            ],
            issuer=(
                settings.JWT_ISSUER
            ),
            audience=(
                settings.JWT_AUDIENCE
            ),
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_aud": True,
                "verify_iss": True,
            },
        )

    except JWTError as exc:
        raise ValueError(
            "Invalid token"
        ) from exc


def get_token_ttl(
    payload: dict[str, Any],
) -> int:
    exp = int(
        payload.get(
            "exp",
            0,
        )
    )

    now = int(
        utc_now().timestamp()
    )

    return max(
        exp - now,
        0,
    )