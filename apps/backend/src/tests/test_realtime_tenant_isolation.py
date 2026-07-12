import pytest

from src.realtime.manager import (
    GLOBAL_REALTIME_CHANNEL,
    ConnectionManager,
    build_company_channel,
)
from src.realtime.router_realtime import resolve_realtime_channel


COMPANY_A = "00000000-0000-0000-0000-000000000001"
COMPANY_B = "00000000-0000-0000-0000-000000000002"


class FakeWebSocket:
    def __init__(self, query_params: dict[str, str] | None = None):
        self.query_params = query_params or {}
        self.messages: list[dict] = []
        self.accepted = False

    async def accept(self):
        self.accepted = True

    async def send_json(self, message: dict):
        self.messages.append(message)


@pytest.mark.asyncio
async def test_company_event_is_not_broadcast_to_other_company():
    connection_manager = ConnectionManager()
    company_a_socket = FakeWebSocket()
    company_b_socket = FakeWebSocket()
    global_socket = FakeWebSocket()

    await connection_manager.connect(
        build_company_channel(COMPANY_A),
        company_a_socket,
    )
    await connection_manager.connect(
        build_company_channel(COMPANY_B),
        company_b_socket,
    )
    await connection_manager.connect(
        GLOBAL_REALTIME_CHANNEL,
        global_socket,
    )

    event = {
        "type": "finance.transaction.posted",
        "company_id": COMPANY_A,
        "payload": {"transaction_id": "trx-1"},
    }

    await connection_manager.broadcast_event(event)

    assert company_a_socket.messages == [event]
    assert company_b_socket.messages == []
    assert global_socket.messages == [event]


def test_normal_user_cannot_override_company_channel():
    websocket = FakeWebSocket({"company_id": COMPANY_B})
    payload = {
        "company_id": COMPANY_A,
        "is_superuser": False,
    }

    channel = resolve_realtime_channel(websocket, payload)

    assert channel == build_company_channel(COMPANY_A)


def test_superuser_can_select_one_company_channel():
    websocket = FakeWebSocket({"company_id": COMPANY_B})
    payload = {
        "company_id": COMPANY_A,
        "is_superuser": True,
    }

    channel = resolve_realtime_channel(websocket, payload)

    assert channel == build_company_channel(COMPANY_B)


def test_superuser_without_company_uses_global_channel():
    websocket = FakeWebSocket()
    payload = {
        "company_id": COMPANY_A,
        "is_superuser": True,
    }

    channel = resolve_realtime_channel(websocket, payload)

    assert channel == GLOBAL_REALTIME_CHANNEL


def test_non_superuser_without_company_is_rejected():
    websocket = FakeWebSocket()
    payload = {
        "company_id": None,
        "is_superuser": False,
    }

    channel = resolve_realtime_channel(websocket, payload)

    assert channel is None
