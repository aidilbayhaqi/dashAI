import asyncio
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket

from src.core.config import settings


GLOBAL_REALTIME_CHANNEL = "global"
COMPANY_CHANNEL_PREFIX = "company:"


def build_company_channel(company_id: str | UUID) -> str:
    return f"{COMPANY_CHANNEL_PREFIX}{company_id}"


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, channel: str, websocket: WebSocket):
        connections = self.active_connections[channel]
        if len(connections) >= settings.REALTIME_MAX_CONNECTIONS_PER_CHANNEL:
            await websocket.close(code=1013, reason="Realtime channel is busy")
            return False

        await websocket.accept()
        if websocket not in connections:
            connections.append(websocket)
        return True

    def disconnect(self, websocket: WebSocket):
        empty_channels: list[str] = []
        for channel, connections in list(self.active_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
            if not connections:
                empty_channels.append(channel)

        for channel in empty_channels:
            self.active_connections.pop(channel, None)

    async def _send_json(self, connection: WebSocket, message: dict) -> bool:
        try:
            await asyncio.wait_for(
                connection.send_json(message),
                timeout=settings.REALTIME_SEND_TIMEOUT_SECONDS,
            )
            return True
        except Exception:
            return False

    async def broadcast_to_channel(self, channel: str, message: dict):
        connections = list(self.active_connections.get(channel, []))
        if not connections:
            return

        results = await asyncio.gather(
            *(self._send_json(connection, message) for connection in connections),
            return_exceptions=False,
        )
        for connection, delivered in zip(connections, results, strict=False):
            if not delivered:
                self.disconnect(connection)

    async def broadcast_event(self, message: dict):
        company_id = message.get("company_id")
        if company_id:
            await asyncio.gather(
                self.broadcast_to_channel(
                    build_company_channel(str(company_id)),
                    message,
                ),
                self.broadcast_to_channel(GLOBAL_REALTIME_CHANNEL, message),
            )
            return

        await self.broadcast_to_channel(GLOBAL_REALTIME_CHANNEL, message)

    def stats(self) -> dict[str, int]:
        return {
            "channels": len(self.active_connections),
            "connections": sum(
                len(connections)
                for connections in self.active_connections.values()
            ),
        }


manager = ConnectionManager()
