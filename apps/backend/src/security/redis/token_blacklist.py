from src.core.redis import redis_client


async def blacklist_token(token: str, ttl: int):
    key = f"auth:blacklist:{token}"
    await redis_client.setex(key, ttl, "1")


async def is_token_blacklisted(token: str) -> bool:
    key = f"auth:blacklist:{token}"
    return await redis_client.exists(key) == 1