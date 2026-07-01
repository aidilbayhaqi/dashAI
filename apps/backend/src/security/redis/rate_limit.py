from fastapi import HTTPException, status

from src.core.config import settings
from src.core.redis import redis_client


async def check_login_rate_limit(identifier: str):
    key = f"rate-limit:login:{identifier.lower()}"

    attempts = await redis_client.get(key)

    if attempts and int(attempts) >= settings.LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )


async def increase_login_attempt(identifier: str):
    key = f"rate-limit:login:{identifier.lower()}"

    attempts = await redis_client.incr(key)

    if attempts == 1:
        await redis_client.expire(key, settings.LOGIN_BLOCK_SECONDS)


async def reset_login_attempt(identifier: str):
    key = f"rate-limit:login:{identifier.lower()}"
    await redis_client.delete(key)