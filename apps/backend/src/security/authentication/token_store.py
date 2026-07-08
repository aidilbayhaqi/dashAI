import json
from typing import Any

from src.core.redis import (
    redis_client,
)
from src.security.authentication.jwt import (
    get_token_ttl,
)


ROTATE_REFRESH_TOKEN_SCRIPT = """
if redis.call('EXISTS', KEYS[1]) == 0 then
    return 0
end

redis.call(
    'SET',
    KEYS[2],
    ARGV[1],
    'EX',
    ARGV[2]
)

redis.call(
    'DEL',
    KEYS[1]
)

return 1
"""


def refresh_key(
    jti: str,
) -> str:
    return (
        f"auth:refresh:{jti}"
    )


def blacklist_key(
    jti: str,
) -> str:
    return (
        f"auth:blacklist:{jti}"
    )


def serialize_payload(
    payload: dict[str, Any],
) -> str:
    return json.dumps(
        payload,
        default=str,
        separators=(
            ",",
            ":",
        ),
    )


async def store_refresh_token(
    payload: dict[str, Any],
) -> None:
    jti = str(
        payload["jti"]
    )

    ttl = get_token_ttl(
        payload
    )

    if ttl <= 0:
        return

    await redis_client.set(
        refresh_key(jti),
        serialize_payload(
            payload
        ),
        ex=ttl,
    )


async def rotate_refresh_token(
    *,
    old_jti: str,
    new_payload: dict[str, Any],
) -> bool:
    """
    Menyimpan refresh token baru dan
    menghapus refresh token lama dalam
    satu operasi Redis atomic.
    """

    new_jti = str(
        new_payload["jti"]
    )

    ttl = get_token_ttl(
        new_payload
    )

    if ttl <= 0:
        return False

    result = (
        await redis_client.eval(
            ROTATE_REFRESH_TOKEN_SCRIPT,
            2,
            refresh_key(
                old_jti
            ),
            refresh_key(
                new_jti
            ),
            serialize_payload(
                new_payload
            ),
            ttl,
        )
    )

    return int(result) == 1


async def revoke_refresh_token(
    jti: str,
) -> None:
    await redis_client.delete(
        refresh_key(jti)
    )


async def refresh_token_exists(
    jti: str,
) -> bool:
    return bool(
        await redis_client.exists(
            refresh_key(jti)
        )
    )


async def blacklist_access_token(
    payload: dict[str, Any],
) -> None:
    jti = str(
        payload["jti"]
    )

    ttl = get_token_ttl(
        payload
    )

    if ttl <= 0:
        return

    await redis_client.set(
        blacklist_key(jti),
        "1",
        ex=ttl,
    )


async def is_access_token_blacklisted(
    jti: str,
) -> bool:
    return bool(
        await redis_client.exists(
            blacklist_key(jti)
        )
    )