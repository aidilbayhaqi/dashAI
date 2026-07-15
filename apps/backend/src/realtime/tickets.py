from __future__ import annotations

import json
import secrets
from typing import Any

from src.core.config import settings
from src.core.redis import redis_client


TICKET_PREFIX = "realtime:ticket:"


async def create_realtime_ticket(payload: dict[str, Any]) -> str:
    ticket = secrets.token_urlsafe(32)
    await redis_client.setex(
        f"{TICKET_PREFIX}{ticket}",
        settings.REALTIME_TICKET_TTL_SECONDS,
        json.dumps(payload, separators=(",", ":"), default=str),
    )
    return ticket


async def consume_realtime_ticket(ticket: str) -> dict[str, Any] | None:
    key = f"{TICKET_PREFIX}{ticket}"
    try:
        raw = await redis_client.getdel(key)
    except AttributeError:
        # Compatibility with older Redis clients. Lua keeps consume atomic.
        raw = await redis_client.eval(
            "local v=redis.call('GET',KEYS[1]); "
            "if v then redis.call('DEL',KEYS[1]); end; return v",
            1,
            key,
        )
    if not raw:
        return None
    try:
        value = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None
