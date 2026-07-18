from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from redis.exceptions import RedisError

from src.core.redis import redis_client


_TOKEN_KEY_PREFIX = "ai:action:consumed"


def _token_key(jti: str) -> str:
    return f"{_TOKEN_KEY_PREFIX}:{jti}"


def _remaining_ttl(payload: dict[str, Any]) -> int:
    raw_exp = payload.get("exp")
    if isinstance(raw_exp, datetime):
        expires_at = raw_exp
    else:
        try:
            expires_at = datetime.fromtimestamp(float(raw_exp), tz=timezone.utc)
        except (TypeError, ValueError, OSError) as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Waktu kedaluwarsa AI action token tidak valid.",
            ) from exc

    remaining = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AI action token sudah kedaluwarsa.",
        )
    return remaining


async def claim_ai_action_token(payload: dict[str, Any]) -> str:
    """Atomically make an AI action token one-time-use.

    The idempotency layer handles replay of the same request key. A second
    request with another idempotency key but the same action token is rejected.
    """

    jti = str(payload.get("jti") or "")
    if not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AI action token tidak memiliki identifier.",
        )

    key = _token_key(jti)
    try:
        claimed = await redis_client.set(
            key,
            "consumed",
            ex=_remaining_ttl(payload),
            nx=True,
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Layanan konfirmasi AI sedang tidak tersedia. "
                "Data belum diproses."
            ),
        ) from exc

    if not claimed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AI action token sudah pernah digunakan.",
        )
    return key


async def release_ai_action_token_claim(key: str) -> None:
    """Release a claim only when the business operation failed."""

    try:
        await redis_client.delete(key)
    except RedisError:
        # Fail closed. A temporary unusable token is safer than replaying a
        # financial action after an uncertain Redis failure.
        return
