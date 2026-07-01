import json
import os

import httpx
import pytest
import websockets


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
WS_URL = os.getenv("TEST_WS_URL", "ws://localhost:8000")


async def server_available() -> bool:
    try:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=2.0) as client:
            response = await client.get("/health")
            return response.status_code == 200
    except Exception:
        return False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_secure_websocket_ping_pong():
    if not await server_available():
        pytest.skip(f"Live API server is not reachable at {BASE_URL}")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "superadmin@dashai.test",
                "password": "admin123",
            },
        )

        assert login_response.status_code == 200, login_response.text

        token = login_response.json()["token"]["access_token"]

    async with websockets.connect(
        f"{WS_URL}/realtime/ws?token={token}"
    ) as websocket:
        connection_message = json.loads(await websocket.recv())

        assert connection_message["type"] == "connection.success"

        await websocket.send("ping")

        pong_message = json.loads(await websocket.recv())

        assert pong_message["type"] == "pong"
        assert pong_message["message"] == "WebSocket is alive"