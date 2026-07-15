import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from src.core.config import settings
from src.realtime.listener import listener_state
from src.realtime.manager import (
    GLOBAL_REALTIME_CHANNEL,
    build_company_channel,
    manager,
)
from src.realtime.tickets import (
    consume_realtime_ticket,
    create_realtime_ticket,
)
from src.security.authentication.jwt import decode_token
from src.security.authentication.token_store import is_access_token_blacklisted
from src.security.dependencies import CurrentUser, require_permission
from src.security.permissions import (
    REALTIME_EVENTS_VIEW,
    realtime_modules_from_permissions,
)
from src.security.tenant import resolve_company_id


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/realtime", tags=["Realtime"])


def _origin_is_allowed(websocket: WebSocket) -> bool:
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
        await websocket.close(code=code)


async def _authenticate_legacy_access_token(token: str) -> dict | None:
    try:
        payload = decode_token(token)
    except ValueError:
        return None

    if payload.get("type") != "access":
        return None

    jti = payload.get("jti")
    if not jti or await is_access_token_blacklisted(str(jti)):
        return None

    return payload


async def authenticate_websocket(websocket: WebSocket) -> dict | None:
    if not _origin_is_allowed(websocket):
        await _close_websocket(
            websocket,
            code=1008,
            reason="Origin not allowed",
        )
        return None

    ticket = websocket.query_params.get("ticket")
    if ticket:
        payload = await consume_realtime_ticket(ticket)
        if payload is None:
            await _close_websocket(
                websocket,
                code=1008,
                reason="Invalid or expired realtime ticket",
            )
            return None
        return payload

    token = websocket.query_params.get("token")
    if not token or not settings.REALTIME_ALLOW_QUERY_ACCESS_TOKEN:
        await _close_websocket(
            websocket,
            code=1008,
            reason="Missing realtime ticket",
        )
        return None

    payload = await _authenticate_legacy_access_token(token)
    if payload is None:
        await _close_websocket(
            websocket,
            code=1008,
            reason="Invalid access token",
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
        requested_company_id = (
            payload.get("realtime_company_id")
            or websocket.query_params.get("company_id")
        )
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


@router.post("/ticket")
async def issue_realtime_ticket(
    company_id: UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(
        require_permission(REALTIME_EVENTS_VIEW)
    ),
):
    effective_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    payload = {
        "sub": str(current_user.user_id),
        "is_superuser": current_user.is_superuser,
        "company_id": (
            str(current_user.company_id) if current_user.company_id else None
        ),
        "realtime_company_id": (
            str(effective_company_id) if effective_company_id else None
        ),
        "permissions": current_user.permissions,
        "access_scope": current_user.access_scope,
        "branch_ids": current_user.branch_ids,
        "type": "realtime_ticket",
    }
    ticket = await create_realtime_ticket(payload)
    return {
        "ticket": ticket,
        "expires_in": settings.REALTIME_TICKET_TTL_SECONDS,
    }


@router.get("/health")
async def realtime_health(
    _current_user: CurrentUser = Depends(
        require_permission(REALTIME_EVENTS_VIEW)
    ),
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
        await _close_websocket(
            websocket,
            code=1008,
            reason="Company scope unavailable",
        )
        return

    is_superuser = payload.get("is_superuser") is True
    allowed_modules = None if is_superuser else (
        realtime_modules_from_permissions(payload.get("permissions") or [])
    )
    allowed_branch_ids = None
    if not is_superuser and payload.get("access_scope") == "selected_branches":
        allowed_branch_ids = {
            str(branch_id)
            for branch_id in (payload.get("branch_ids") or [])
            if branch_id
        }
    if not await manager.connect(
        channel,
        websocket,
        allowed_modules=allowed_modules,
        allowed_branch_ids=allowed_branch_ids,
    ):
        return

    try:
        await websocket.send_json(
            {
                "type": "connection.success",
                "schema_version": "1.1",
                "scope": "global" if channel == GLOBAL_REALTIME_CHANNEL else "company",
                "user_id": payload.get("sub"),
                "company_id": _channel_company_id(channel),
                "modules": sorted(allowed_modules) if allowed_modules is not None else ["*"],
                "branches": (
                    sorted(allowed_branch_ids)
                    if allowed_branch_ids is not None
                    else ["*"]
                ),
            }
        )

        while True:
            message = await websocket.receive_text()
            if len(message.encode("utf-8")) > settings.REALTIME_MAX_MESSAGE_BYTES:
                await _close_websocket(
                    websocket,
                    code=1009,
                    reason="Message too large",
                )
                return

            if message == "ping":
                await websocket.send_json(
                    {"type": "pong", "message": "WebSocket is alive"}
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
                    {"type": "pong", "message": "WebSocket is alive"}
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
