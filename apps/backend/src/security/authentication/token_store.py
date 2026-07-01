import json

from src.core.redis import redis_client
from src.security.authentication.jwt import get_token_ttl


async def store_refresh_token(payload: dict):
    jti = payload["jti"]
    ttl = get_token_ttl(payload)

    if ttl <= 0:
        return

    key = f"auth:refresh:{jti}"

    await redis_client.setex(
        key,
        ttl,
        json.dumps(payload, default=str),
    )


async def revoke_refresh_token(jti: str):
    await redis_client.delete(f"auth:refresh:{jti}")


async def refresh_token_exists(jti: str) -> bool:
    return await redis_client.exists(f"auth:refresh:{jti}") == 1


async def blacklist_access_token(payload: dict):
    jti = payload["jti"]
    ttl = get_token_ttl(payload)

    if ttl <= 0:
        return

    await redis_client.setex(
        f"auth:blacklist:{jti}",
        ttl,
        "1",
    )


async def is_access_token_blacklisted(jti: str) -> bool:
    return await redis_client.exists(f"auth:blacklist:{jti}") == 1