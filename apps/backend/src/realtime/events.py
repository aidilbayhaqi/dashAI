import json
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from src.core.redis import redis_client
from src.modules.dashboard.cache_dashboard import invalidate_dashboard_cache


logger = logging.getLogger(__name__)
ERP_EVENT_CHANNEL = "erp:realtime:events"


class RealtimeEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    schema_version: str = "1.0"
    type: str = Field(min_length=3, max_length=160)
    module: str | None = Field(default=None, max_length=80)
    company_id: UUID | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    published_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


def _json_safe(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return value


def build_realtime_event(
    event_type: str,
    payload: dict,
    *,
    company_id: str | UUID | None = None,
    module: str | None = None,
) -> RealtimeEvent:
    serialized_payload = _json_safe(payload)
    resolved_company_id = company_id or serialized_payload.get("company_id")

    return RealtimeEvent(
        type=event_type,
        module=module,
        company_id=resolved_company_id,
        payload=serialized_payload,
    )


async def publish_realtime_event(
    event_type: str,
    payload: dict,
    *,
    company_id: str | UUID | None = None,
    module: str | None = None,
) -> RealtimeEvent:
    event = build_realtime_event(
        event_type,
        payload,
        company_id=company_id,
        module=module,
    )
    message = event.model_dump(mode="json")

    await invalidate_dashboard_cache(event.company_id)
    await redis_client.publish(
        ERP_EVENT_CHANNEL,
        json.dumps(message, separators=(",", ":"), default=str),
    )
    return event


async def publish_realtime_event_safe(
    event_type: str,
    payload: dict,
    *,
    company_id: str | UUID | None = None,
    module: str | None = None,
) -> RealtimeEvent | None:
    """Publish without turning a successful database commit into API failure."""

    try:
        return await publish_realtime_event(
            event_type,
            payload,
            company_id=company_id,
            module=module,
        )
    except Exception:
        logger.exception("Realtime event publish failed: %s", event_type)
        return None
