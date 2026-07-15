import asyncio
from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID

from fastapi import WebSocket

from src.core.config import settings


GLOBAL_REALTIME_CHANNEL = "global"
COMPANY_CHANNEL_PREFIX = "company:"


def build_company_channel(company_id: str | UUID) -> str:
    return f"{COMPANY_CHANNEL_PREFIX}{company_id}"


@dataclass(eq=False)
class RealtimeConnection:
    websocket: WebSocket
    allowed_modules: set[str] | None = None
    allowed_branch_ids: set[str] | None = None

    def can_receive(self, message: dict) -> bool:
        module = str(message.get("module") or "").strip().lower()
        if (
            self.allowed_modules is not None
            and module
            and module not in self.allowed_modules
        ):
            return False

        if self.allowed_branch_ids is None:
            return True

        payload = message.get("payload")
        branch_id = (
            payload.get("branch_id")
            if isinstance(payload, dict)
            else None
        )
        # Company-wide records use NULL branch and remain visible to all roles
        # in the company, matching HTTP tenant-scope behavior.
        return branch_id in (None, "") or str(branch_id) in self.allowed_branch_ids


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[
            str,
            list[RealtimeConnection],
        ] = defaultdict(list)

    async def connect(
        self,
        channel: str,
        websocket: WebSocket,
        *,
        allowed_modules: set[str] | None = None,
        allowed_branch_ids: set[str] | None = None,
    ) -> bool:
        connections = self.active_connections[channel]
        if len(connections) >= settings.REALTIME_MAX_CONNECTIONS_PER_CHANNEL:
            await websocket.close(code=1013, reason="Realtime channel is busy")
            return False

        await websocket.accept()
        if not any(item.websocket is websocket for item in connections):
            connections.append(
                RealtimeConnection(
                    websocket=websocket,
                    allowed_modules=allowed_modules,
                    allowed_branch_ids=allowed_branch_ids,
                )
            )
        return True

    def disconnect(self, websocket: WebSocket) -> None:
        empty_channels: list[str] = []
        for channel, connections in list(self.active_connections.items()):
            self.active_connections[channel] = [
                item for item in connections if item.websocket is not websocket
            ]
            if not self.active_connections[channel]:
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

    async def broadcast_to_channel(self, channel: str, message: dict) -> None:
        connections = [
            item
            for item in list(self.active_connections.get(channel, []))
            if item.can_receive(message)
        ]
        if not connections:
            return

        results = await asyncio.gather(
            *(
                self._send_json(item.websocket, message)
                for item in connections
            ),
            return_exceptions=False,
        )
        for item, delivered in zip(connections, results, strict=False):
            if not delivered:
                self.disconnect(item.websocket)

    async def broadcast_event(self, message: dict) -> None:
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
