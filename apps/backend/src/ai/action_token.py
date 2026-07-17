from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from jose import JWTError, jwt

from src.core.config import settings


AI_ACTION_TOKEN_TYPE = "ai_action"


def issue_ai_action_token(
    *,
    action: str,
    user_id: UUID,
    company_id: UUID,
    branch_id: UUID | None,
) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.AI_ACTION_TOKEN_TTL_SECONDS
    )
    payload = {
        "type": AI_ACTION_TOKEN_TYPE,
        "action": action,
        "sub": str(user_id),
        "company_id": str(company_id),
        "branch_id": str(branch_id) if branch_id else None,
        "jti": str(uuid4()),
        "iat": datetime.now(timezone.utc),
        "exp": expires_at,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    token = jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token, expires_at


def verify_ai_action_token(
    *,
    token: str,
    expected_action: str,
    user_id: UUID,
) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AI action token tidak valid atau sudah kedaluwarsa.",
        ) from exc

    if payload.get("type") != AI_ACTION_TOKEN_TYPE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token bukan AI action token.",
        )

    if payload.get("action") != expected_action:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AI action token tidak sesuai dengan aksi yang diminta.",
        )

    if str(payload.get("sub")) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI action token dimiliki pengguna lain.",
        )

    try:
        payload["company_id"] = UUID(str(payload["company_id"]))
        payload["branch_id"] = (
            UUID(str(payload["branch_id"]))
            if payload.get("branch_id")
            else None
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Scope pada AI action token tidak valid.",
        ) from exc

    return payload
