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
    draft_id: UUID,
    user_id: UUID,
    company_id: UUID,
    branch_id: UUID | None,
) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.AI_ACTION_TOKEN_TTL_SECONDS)
    payload = {
        "type": AI_ACTION_TOKEN_TYPE,
        "action": action,
        "draft_id": str(draft_id),
        "sub": str(user_id),
        "company_id": str(company_id),
        "branch_id": str(branch_id) if branch_id else None,
        "jti": str(uuid4()),
        "iat": now,
        "exp": expires_at,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


def verify_ai_action_token(
    *,
    token: str,
    expected_action: str,
    expected_draft_id: UUID,
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
            UUID(str(payload["branch_id"])) if payload.get("branch_id") else None
        )
        payload["draft_id"] = UUID(str(payload["draft_id"]))
        payload["jti"] = str(UUID(str(payload["jti"])))
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Scope atau identifier pada AI action token tidak valid.",
        ) from exc

    if payload["draft_id"] != expected_draft_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AI action token tidak sesuai dengan draft yang dikonfirmasi.",
        )

    return payload
