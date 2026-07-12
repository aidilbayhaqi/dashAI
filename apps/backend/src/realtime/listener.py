import asyncio
import inspect
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from pydantic import ValidationError

from src.core.config import settings
from src.core.redis import redis_client
from src.realtime.events import ERP_EVENT_CHANNEL, RealtimeEvent
from src.realtime.manager import manager


logger = logging.getLogger(__name__)


@dataclass
class RealtimeListenerState:
    connected: bool = False
    reconnect_count: int = 0
    connected_at: datetime | None = None
    last_message_at: datetime | None = None
    last_error: str | None = None


listener_state = RealtimeListenerState()
_recent_event_ids: dict[str, float] = {}


def _prune_recent_events(now: float) -> None:
    ttl = settings.REALTIME_DEDUP_TTL_SECONDS
    expired = [
        event_id
        for event_id, seen_at in _recent_event_ids.items()
        if now - seen_at > ttl
    ]
    for event_id in expired:
        _recent_event_ids.pop(event_id, None)


async def dispatch_realtime_message(raw_message: object) -> None:
    if isinstance(raw_message, bytes):
        raw_message = raw_message.decode("utf-8", errors="replace")
    if not isinstance(raw_message, str):
        logger.warning("Ignored realtime event with unsupported payload type")
        return

    if len(raw_message.encode("utf-8")) > settings.REALTIME_MAX_MESSAGE_BYTES:
        logger.warning("Ignored realtime event larger than configured limit")
        return

    try:
        event = RealtimeEvent.model_validate_json(raw_message)
    except ValidationError:
        logger.warning("Ignored invalid realtime event envelope")
        return

    loop = asyncio.get_running_loop()
    now = loop.time()
    _prune_recent_events(now)
    event_id = str(event.event_id)
    if event_id in _recent_event_ids:
        logger.debug("Ignored duplicate realtime event %s", event_id)
        return

    _recent_event_ids[event_id] = now
    listener_state.last_message_at = datetime.now(timezone.utc)
    await manager.broadcast_event(event.model_dump(mode="json"))


async def _close_pubsub(pubsub: object) -> None:
    close = getattr(pubsub, "aclose", None) or getattr(pubsub, "close", None)
    if close is None:
        return
    result = close()
    if inspect.isawaitable(result):
        await result


async def _listen_once() -> None:
    pubsub = redis_client.pubsub()
    try:
        await pubsub.subscribe(ERP_EVENT_CHANNEL)
        listener_state.connected = True
        listener_state.connected_at = datetime.now(timezone.utc)
        listener_state.last_error = None
        logger.info("Redis realtime listener subscribed")

        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1.0,
            )
            if message:
                try:
                    await dispatch_realtime_message(message.get("data"))
                except Exception:
                    # Satu frame yang gagal tidak boleh mematikan listener.
                    logger.exception("Realtime frame dispatch failed")
            await asyncio.sleep(0.01)
    finally:
        listener_state.connected = False
        try:
            await pubsub.unsubscribe(ERP_EVENT_CHANNEL)
        except Exception:
            logger.debug("Realtime unsubscribe failed", exc_info=True)
        try:
            await _close_pubsub(pubsub)
        except Exception:
            logger.debug("Realtime pubsub close failed", exc_info=True)


async def start_realtime_listener() -> None:
    delay = settings.REALTIME_RECONNECT_MIN_SECONDS

    while True:
        connected_at: datetime | None = None
        try:
            await _listen_once()
            delay = settings.REALTIME_RECONNECT_MIN_SECONDS
        except asyncio.CancelledError:
            logger.info("Realtime listener cancelled")
            raise
        except Exception as exc:
            connected_at = listener_state.connected_at
            listener_state.connected = False
            listener_state.reconnect_count += 1
            listener_state.last_error = str(exc)

            # Setelah koneksi stabil cukup lama, backoff dimulai lagi dari awal.
            if connected_at is not None:
                stable_seconds = (
                    datetime.now(timezone.utc) - connected_at
                ).total_seconds()
                if stable_seconds >= settings.REALTIME_RECONNECT_MAX_SECONDS:
                    delay = settings.REALTIME_RECONNECT_MIN_SECONDS

            logger.exception(
                "Realtime listener disconnected; retrying in %.1fs",
                delay,
            )
            await asyncio.sleep(delay)
            delay = min(
                delay * 2,
                settings.REALTIME_RECONNECT_MAX_SECONDS,
            )
