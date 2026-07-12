import json
from uuid import UUID

import pytest

from src.realtime.events import RealtimeEvent, build_realtime_event
from src.realtime.listener import _recent_event_ids, dispatch_realtime_message
from src.realtime.manager import manager


COMPANY_ID = "00000000-0000-0000-0000-000000000001"


def test_realtime_event_has_typed_envelope_and_json_safe_payload():
    event = build_realtime_event(
        "finance.transaction.updated",
        {"id": UUID(COMPANY_ID), "amount": 100},
        company_id=COMPANY_ID,
        module="finance",
    )

    assert isinstance(event, RealtimeEvent)
    assert str(event.company_id) == COMPANY_ID
    assert event.payload["id"] == COMPANY_ID
    assert event.schema_version == "1.0"


@pytest.mark.asyncio
async def test_listener_deduplicates_same_event(monkeypatch):
    _recent_event_ids.clear()
    delivered: list[dict] = []

    async def capture(message: dict):
        delivered.append(message)

    monkeypatch.setattr(manager, "broadcast_event", capture)
    event = build_realtime_event(
        "products.stock.adjusted",
        {"product_id": "product-1"},
        company_id=COMPANY_ID,
        module="products",
    )
    raw = json.dumps(event.model_dump(mode="json"))

    await dispatch_realtime_message(raw)
    await dispatch_realtime_message(raw)

    assert len(delivered) == 1
