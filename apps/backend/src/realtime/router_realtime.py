import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.security.authentication.jwt import decode_token
from src.security.authentication.token_store import is_access_token_blacklisted
from src.realtime.manager import manager


router = APIRouter(prefix="/realtime", tags=["Realtime"])


async def authenticate_websocket(websocket: WebSocket) -> dict | None:
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008)
        return None

    try:
        payload = decode_token(token)
    except ValueError:
        await websocket.close(code=1008)
        return None

    if payload.get("type") != "access":
        await websocket.close(code=1008)
        return None

    jti = payload.get("jti")

    if not jti or await is_access_token_blacklisted(jti):
        await websocket.close(code=1008)
        return None

    return payload


def resolve_realtime_channel(websocket: WebSocket, payload: dict) -> str:
    return payload.get("company_id") or websocket.query_params.get("company_id") or "global"


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    payload = await authenticate_websocket(websocket)

    if not payload:
        return

    channel = resolve_realtime_channel(websocket, payload)
    await manager.connect(channel, websocket)

    try:
        await websocket.send_json({
            "type": "connection.success",
            "message": "WebSocket connected",
            "channel": channel,
            "user_id": payload.get("sub"),
            "company_id": payload.get("company_id"),
        })

        while True:
            message = await websocket.receive_text()

            if message == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "message": "WebSocket is alive",
                    "channel": channel,
                })
                continue

            try:
                data = json.loads(message)

                if data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "message": "WebSocket is alive",
                        "channel": channel,
                    })
                    continue

                await websocket.send_json({
                    "type": "message.received",
                    "payload": data,
                    "channel": channel,
                })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "message.received",
                    "message": message,
                    "channel": channel,
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)

    except Exception as exc:
        manager.disconnect(websocket)
        print("WebSocket error:", str(exc))