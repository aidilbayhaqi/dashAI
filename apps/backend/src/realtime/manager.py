from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, channel: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket):
        empty_channels = []

        for channel, connections in self.active_connections.items():
            if websocket in connections:
                connections.remove(websocket)

            if not connections:
                empty_channels.append(channel)

        for channel in empty_channels:
            del self.active_connections[channel]

    async def broadcast_to_channel(self, channel: str, message: dict):
        connections = list(self.active_connections.get(channel, []))
        disconnected = []

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast(self, message: dict):
        for channel in list(self.active_connections.keys()):
            await self.broadcast_to_channel(channel, message)


manager = ConnectionManager()