from fastapi import (
    HTTPException,
    Request,
    Response,
    status,
)

from src.core.config import settings


def set_refresh_cookie(
    response: Response,
    refresh_token: str,
) -> None:
    max_age = (
        settings
        .REFRESH_TOKEN_EXPIRE_DAYS
        * 24
        * 60
        * 60
    )

    response.set_cookie(
        key=(
            settings
            .REFRESH_COOKIE_NAME
        ),
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        secure=(
            settings.COOKIE_SECURE
        ),
        samesite=(
            settings.COOKIE_SAMESITE
        ),
        domain=(
            settings.COOKIE_DOMAIN
        ),
        path=(
            settings
            .REFRESH_COOKIE_PATH
        ),
    )


def clear_refresh_cookie(
    response: Response,
) -> None:
    response.delete_cookie(
        key=(
            settings
            .REFRESH_COOKIE_NAME
        ),
        httponly=True,
        secure=(
            settings.COOKIE_SECURE
        ),
        samesite=(
            settings.COOKIE_SAMESITE
        ),
        domain=(
            settings.COOKIE_DOMAIN
        ),
        path=(
            settings
            .REFRESH_COOKIE_PATH
        ),
    )


def verify_trusted_origin(
    request: Request,
) -> None:
    origin = request.headers.get(
        "origin"
    )

    # curl, Postman, atau komunikasi
    # server-to-server dapat tidak
    # mengirim Origin.
    if origin is None:
        return

    normalized_origin = (
        origin.rstrip("/")
    )

    if (
        normalized_origin
        not in
        settings.cors_origins_list
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_403_FORBIDDEN
            ),
            detail=(
                "Untrusted request origin"
            ),
        )