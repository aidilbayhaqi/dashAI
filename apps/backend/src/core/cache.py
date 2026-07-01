import json
from typing import Any

from src.core.redis import redis_client


async def set_cache(key: str, value: Any, ttl: int = 300):
    await redis_client.setex(
        key,
        ttl,
        json.dumps(value, default=str)
    )


async def get_cache(key: str):
    data = await redis_client.get(key)

    if not data:
        return None

    return json.loads(data)


async def delete_cache(key: str):
    await redis_client.delete(key)


async def delete_pattern(pattern: str):
    keys = await redis_client.keys(pattern)

    if keys:
        await redis_client.delete(*keys)