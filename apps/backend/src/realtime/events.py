import json
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from src.core.redis import redis_client


ERP_EVENT_CHANNEL = "erp:realtime:events"


def _json_safe(value):
    if isinstance(value, UUID):
        return str(value)

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Enum):
        return value.value

    return value


def _serialize_payload(payload: dict) -> dict:
    return {key: _json_safe(value) for key, value in payload.items()}


async def publish_realtime_event(
    event_type: str,
    payload: dict,
    *,
    company_id: str | UUID | None = None,
    module: str | None = None,
):
    serialized_payload = _serialize_payload(payload)
    resolved_company_id = company_id or serialized_payload.get("company_id")

    message = {
        "type": event_type,
        "module": module,
        "company_id": str(resolved_company_id) if resolved_company_id else None,
        "payload": serialized_payload,
        "published_at": datetime.utcnow().isoformat(),
    }

    await redis_client.publish(
        ERP_EVENT_CHANNEL,
        json.dumps(message, default=str),
    )