import pytest

from src.realtime.router_realtime import authenticate_websocket
from src.security.authentication.jwt import create_access_token


class FakeWebSocket:
    def __init__(self, token: str | None):
        self.query_params = {}

        if token:
            self.query_params["token"] = token

        self.closed_code = None

    async def close(self, code: int):
        self.closed_code = code


@pytest.mark.asyncio
async def test_websocket_auth_closes_without_token():
    websocket = FakeWebSocket(token=None)

    payload = await authenticate_websocket(websocket)

    assert payload is None
    assert websocket.closed_code == 1008


@pytest.mark.asyncio
async def test_websocket_auth_accepts_valid_token(monkeypatch):
    async def fake_blacklist_check(jti: str) -> bool:
        return False

    monkeypatch.setattr(
        "src.realtime.router_realtime.is_access_token_blacklisted",
        fake_blacklist_check,
    )

    token = create_access_token(
        user_id="00000000-0000-0000-0000-000000000001",
        claims={
            "email": "test@example.com",
            "full_name": "Test User",
            "is_superuser": True,
            "company_id": None,
            "role_id": None,
            "permissions": [],
            "branch_ids": [],
        },
    )

    websocket = FakeWebSocket(token=token)

    payload = await authenticate_websocket(websocket)

    assert payload is not None
    assert payload["type"] == "access"
    assert payload["sub"] == "00000000-0000-0000-0000-000000000001"
    assert websocket.closed_code is None