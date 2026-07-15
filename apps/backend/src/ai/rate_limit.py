import logging
from uuid import UUID

from fastapi import HTTPException, status

from src.core.config import settings
from src.core.redis import redis_client


logger = logging.getLogger(__name__)


async def enforce_ai_rate_limit(user_id: UUID) -> None:
    """Per-user fixed-window limiter. Fails closed only when limit is exceeded."""

    key = f"ai:analytics:rate:{user_id}"
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, 60)
    except Exception:
        # The rule-based assistant must stay available when Redis is degraded.
        logger.exception("AI rate-limit check failed open for user %s", user_id)
        return

    if count > settings.AI_RATE_LIMIT_PER_MINUTE:
        ttl = await redis_client.ttl(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Batas pertanyaan AI tercapai. "
                f"Coba lagi dalam {max(int(ttl), 1)} detik."
            ),
            headers={"Retry-After": str(max(int(ttl), 1))},
        )
