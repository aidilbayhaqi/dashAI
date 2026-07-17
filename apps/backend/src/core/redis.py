from redis.asyncio import Redis

from src.core.config import settings


def build_redis_client() -> Redis:
    """Build Redis from either a hosted URL or local host/port settings."""

    if settings.REDIS_URL:
        return Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )

    return Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD,
        db=settings.REDIS_DB,
        decode_responses=True,
    )


redis_client = build_redis_client()


async def check_redis_connection() -> bool:
    try:
        return bool(await redis_client.ping())
    except Exception:
        return False


async def close_redis_connection() -> None:
    await redis_client.aclose()
