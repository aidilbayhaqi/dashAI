import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from src.core.config import settings
from src.realtime.listener import listener_state
from src.realtime.manager import (
    GLOBAL_REALTIME_CHANNEL,
    build_company_channel,
    manager,
)
from src.security.authentication.jwt import decode_token
from src.security.dependencies import CurrentUser, get_current_user
from src.security.authentication.token_store import is_access_token_blacklisted


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/realtime", tags=["Realtime"])


def _origin_is_allowed(websocket: WebSocket) -> bool:
    # Starlette WebSocket always exposes ``headers``. Using ``getattr`` keeps
    # this helper compatible with lightweight test doubles and older callers.
    headers = getattr(websocket, "headers", None)
    origin = headers.get("origin") if headers is not None else None
    if not origin:
        return not settings.is_production
    normalized = origin.rstrip("/")
    return normalized in settings.cors_origins_list


async def _close_websocket(
    websocket: WebSocket,
    *,
    code: int,
    reason: str,
) -> None:
    try:
        await websocket.close(code=code, reason=reason)
    except TypeError:
        # Compatibility for simple test doubles whose close method only
        # accepts ``code``. Real Starlette WebSocket objects use the branch
        # above and retain the close reason.
        await websocket.close(code=code)


async def authenticate_websocket(websocket: WebSocket) -> dict | None:
    if not _origin_is_allowed(websocket):
        await _close_websocket(
            websocket,
            code=1008,
            reason="Origin not allowed",
        )
        return None

    token = websocket.query_params.get("token")
    if not token:
        await _close_websocket(
            websocket,
            code=1008,
            reason="Missing access token",
        )
        return None

    try:
        payload = decode_token(token)
    except ValueError:
        await _close_websocket(
            websocket,
            code=1008,
            reason="Invalid access token",
        )
        return None

    if payload.get("type") != "access":
        await _close_websocket(
            websocket,
            code=1008,
            reason="Access token required",
        )
        return None

    jti = payload.get("jti")
    if not jti or await is_access_token_blacklisted(str(jti)):
        await _close_websocket(
            websocket,
            code=1008,
            reason="Token revoked",
        )
        return None

    return payload


def _normalize_company_id(value: object) -> str | None:
    if value in (None, ""):
        return None
    try:
        return str(UUID(str(value)))
    except (TypeError, ValueError):
        return None


def resolve_realtime_channel(websocket: WebSocket, payload: dict) -> str | None:
    if payload.get("is_superuser") is True:
        requested_company_id = websocket.query_params.get("company_id")
        if requested_company_id:
            normalized_company_id = _normalize_company_id(requested_company_id)
            return (
                build_company_channel(normalized_company_id)
                if normalized_company_id
                else None
            )
        return GLOBAL_REALTIME_CHANNEL

    token_company_id = _normalize_company_id(payload.get("company_id"))
    return build_company_channel(token_company_id) if token_company_id else None


def _channel_company_id(channel: str) -> str | None:
    if not channel.startswith("company:"):
        return None
    return channel.removeprefix("company:")


@router.get("/health")
async def realtime_health(
    _current_user: CurrentUser = Depends(get_current_user),
):
    return {
        "listener_connected": listener_state.connected,
        "listener_reconnect_count": listener_state.reconnect_count,
        "connected_at": listener_state.connected_at,
        "last_message_at": listener_state.last_message_at,
        "last_error": listener_state.last_error,
        **manager.stats(),
    }


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    payload = await authenticate_websocket(websocket)
    if not payload:
        return

    channel = resolve_realtime_channel(websocket, payload)
    if channel is None:
        await websocket.close(code=1008, reason="Company scope unavailable")
        return

    if not await manager.connect(channel, websocket):
        return

    try:
        await websocket.send_json(
            {
                "type": "connection.success",
                "schema_version": "1.0",
                "scope": "global" if channel == GLOBAL_REALTIME_CHANNEL else "company",
                "user_id": payload.get("sub"),
                "company_id": _channel_company_id(channel),
            }
        )

        while True:
            message = await websocket.receive_text()
            if len(message.encode("utf-8")) > settings.REALTIME_MAX_MESSAGE_BYTES:
                await websocket.close(code=1009, reason="Message too large")
                return

            if message == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "message": "WebSocket is alive",
                    }
                )
                continue

            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "code": "invalid_json"}
                )
                continue

            if isinstance(data, dict) and data.get("type") == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "message": "WebSocket is alive",
                    }
                )
                continue

            await websocket.send_json(
                {
                    "type": "error",
                    "code": "read_only_socket",
                    "message": "Client messages are not accepted on this socket.",
                }
            )

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket connection failed")
    finally:
        manager.disconnect(websocket)
