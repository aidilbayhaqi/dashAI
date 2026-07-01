from redis.asyncio import Redis
from src.core.config import settings


redis_client = Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    db=settings.REDIS_DB,
    decode_responses=True,
)


async def check_redis_connection() -> bool:
    try:
        return await redis_client.ping()
    except Exception:
        return False


async def close_redis_connection():
    await redis_client.aclose()