from __future__ import annotations

import hashlib
import json
import logging
import re
import secrets
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Awaitable, Callable, TypeVar
from urllib.parse import parse_qsl, urlencode

from fastapi import Header, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from redis.exceptions import RedisError

from src.core.config import settings
from src.core.redis import redis_client
from src.security.dependencies import CurrentUser


logger = logging.getLogger(__name__)

IDEMPOTENCY_HEADER = "Idempotency-Key"
IDEMPOTENCY_NAMESPACE = "idempotency:v1"

DEFAULT_PROCESSING_TTL_SECONDS = 120
DEFAULT_COMPLETED_TTL_SECONDS = 24 * 60 * 60

IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")

T = TypeVar("T")


class IdempotencyState(StrEnum):
    ACQUIRED = "acquired"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


@dataclass(frozen=True)
class IdempotencyContext:
    raw_key: str
    key_hash: str
    scope: str
    scope_hash: str
    request_fingerprint: str
    method: str
    path: str
    owner_token: str

    @property
    def redis_base_key(self) -> str:
        return f"{IDEMPOTENCY_NAMESPACE}:{self.scope_hash}:{self.key_hash}"

    @property
    def pending_key(self) -> str:
        return f"{self.redis_base_key}:pending"

    @property
    def completed_key(self) -> str:
        return f"{self.redis_base_key}:completed"


@dataclass(frozen=True)
class CachedIdempotencyResponse:
    fingerprint: str
    status_code: int
    body: Any
    headers: dict[str, str]


@dataclass(frozen=True)
class IdempotencyReservation:
    state: IdempotencyState
    context: IdempotencyContext
    cached_response: CachedIdempotencyResponse | None = None


_RESERVE_SCRIPT = """
local completed = redis.call("GET", KEYS[2])
if completed then
    return {"completed", completed}
end

local pending = redis.call("GET", KEYS[1])
if pending then
    return {"pending", pending}
end

redis.call("SET", KEYS[1], ARGV[1], "EX", tonumber(ARGV[2]))
return {"acquired", ARGV[1]}
"""

_COMPLETE_SCRIPT = """
local pending = redis.call("GET", KEYS[1])
if not pending then
    return 0
end

local pending_data = cjson.decode(pending)
if pending_data["owner_token"] ~= ARGV[1] then
    return -1
end

redis.call("SET", KEYS[2], ARGV[2], "EX", tonumber(ARGV[3]))
redis.call("DEL", KEYS[1])
return 1
"""

_RELEASE_SCRIPT = """
local pending = redis.call("GET", KEYS[1])
if not pending then
    return 0
end

local pending_data = cjson.decode(pending)
if pending_data["owner_token"] ~= ARGV[1] then
    return -1
end

redis.call("DEL", KEYS[1])
return 1
"""


def _processing_ttl_seconds() -> int:
    value = getattr(
        settings,
        "IDEMPOTENCY_PROCESSING_TTL_SECONDS",
        DEFAULT_PROCESSING_TTL_SECONDS,
    )
    return max(int(value), 30)


def _completed_ttl_seconds() -> int:
    value = getattr(
        settings,
        "IDEMPOTENCY_COMPLETED_TTL_SECONDS",
        DEFAULT_COMPLETED_TTL_SECONDS,
    )
    return max(int(value), 300)


def _sha256(value: bytes | str) -> str:
    if isinstance(value, str):
        value = value.encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def _normalize_query_string(query: str) -> str:
    pairs = parse_qsl(query, keep_blank_values=True, strict_parsing=False)
    pairs.sort(key=lambda item: (item[0], item[1]))
    return urlencode(pairs, doseq=True)


def _tenant_scope(current_user: CurrentUser) -> str:
    if current_user.company_id is not None:
        return f"company:{current_user.company_id}"
    return f"user:{current_user.user_id}"


def _decode_redis_value(value: Any) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8")
    return str(value)


def get_idempotency_key(
    idempotency_key: str | None = Header(
        default=None,
        alias=IDEMPOTENCY_HEADER,
    ),
) -> str:
    if idempotency_key is None or not idempotency_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{IDEMPOTENCY_HEADER} header is required",
        )

    normalized = idempotency_key.strip()

    if not IDEMPOTENCY_KEY_PATTERN.fullmatch(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{IDEMPOTENCY_HEADER} must contain 8-128 characters "
                "using letters, numbers, '.', '_', ':' or '-'"
            ),
        )

    return normalized


async def build_idempotency_context(
    *,
    request: Request,
    current_user: CurrentUser,
    raw_key: str,
    scope_override: str | None = None,
) -> IdempotencyContext:
    method = request.method.upper()
    path = request.url.path
    normalized_query = _normalize_query_string(request.url.query)
    content_type = request.headers.get("content-type", "")
    body = await request.body()

    scope = scope_override or _tenant_scope(current_user)
    scope_source = f"{scope}|{method}|{path}"
    fingerprint_source = b"\n".join(
        [
            method.encode("utf-8"),
            path.encode("utf-8"),
            normalized_query.encode("utf-8"),
            content_type.encode("utf-8"),
            body,
        ]
    )

    return IdempotencyContext(
        raw_key=raw_key,
        key_hash=_sha256(raw_key),
        scope=scope,
        scope_hash=_sha256(scope_source)[:32],
        request_fingerprint=_sha256(fingerprint_source),
        method=method,
        path=path,
        owner_token=secrets.token_urlsafe(24),
    )


def _parse_json_record(raw_value: str, *, redis_key: str) -> dict[str, Any]:
    try:
        value = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Invalid idempotency state in Redis",
        ) from exc

    if not isinstance(value, dict):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Invalid idempotency record type for key {redis_key}",
        )

    return value


def _ensure_same_fingerprint(
    stored_fingerprint: str | None,
    context: IdempotencyContext,
) -> None:
    if stored_fingerprint == context.request_fingerprint:
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "This Idempotency-Key was already used with a different "
            "request payload"
        ),
    )


def _redis_unavailable(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Idempotency service is temporarily unavailable. "
            "The request was not processed."
        ),
    )


async def reserve_idempotency_key(
    context: IdempotencyContext,
) -> IdempotencyReservation:
    pending_record = json.dumps(
        {
            "fingerprint": context.request_fingerprint,
            "owner_token": context.owner_token,
            "method": context.method,
            "path": context.path,
        },
        separators=(",", ":"),
    )

    try:
        result = await redis_client.eval(
            _RESERVE_SCRIPT,
            2,
            context.pending_key,
            context.completed_key,
            pending_record,
            _processing_ttl_seconds(),
        )
    except RedisError as exc:
        raise _redis_unavailable(exc) from exc

    if not isinstance(result, (list, tuple)) or len(result) != 2:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unexpected idempotency service response",
        )

    state = _decode_redis_value(result[0])
    raw_record = _decode_redis_value(result[1])
    record = _parse_json_record(raw_record, redis_key=context.redis_base_key)

    _ensure_same_fingerprint(record.get("fingerprint"), context)

    if state == "acquired":
        return IdempotencyReservation(
            state=IdempotencyState.ACQUIRED,
            context=context,
        )

    if state == "pending":
        return IdempotencyReservation(
            state=IdempotencyState.IN_PROGRESS,
            context=context,
        )

    if state == "completed":
        cached = CachedIdempotencyResponse(
            fingerprint=str(record["fingerprint"]),
            status_code=int(record["status_code"]),
            body=record.get("body"),
            headers={
                str(key): str(value)
                for key, value in dict(record.get("headers") or {}).items()
            },
        )
        return IdempotencyReservation(
            state=IdempotencyState.COMPLETED,
            context=context,
            cached_response=cached,
        )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Unknown idempotency state",
    )


async def complete_idempotent_request(
    context: IdempotencyContext,
    *,
    status_code: int,
    body: Any,
    headers: dict[str, str] | None = None,
) -> None:
    completed_record = json.dumps(
        {
            "fingerprint": context.request_fingerprint,
            "status_code": int(status_code),
            "body": body,
            "headers": headers or {},
        },
        separators=(",", ":"),
        default=str,
    )

    try:
        result = await redis_client.eval(
            _COMPLETE_SCRIPT,
            2,
            context.pending_key,
            context.completed_key,
            context.owner_token,
            completed_record,
            _completed_ttl_seconds(),
        )
    except RedisError as exc:
        raise _redis_unavailable(exc) from exc

    result_code = int(result)
    if result_code == 1:
        return
    if result_code == -1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency reservation ownership changed",
        )
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Idempotency reservation expired",
    )


async def release_idempotency_key(context: IdempotencyContext) -> None:
    try:
        await redis_client.eval(
            _RELEASE_SCRIPT,
            1,
            context.pending_key,
            context.owner_token,
        )
    except RedisError:
        return


def replay_cached_response(
    reservation: IdempotencyReservation,
) -> JSONResponse:
    cached = reservation.cached_response
    if reservation.state is not IdempotencyState.COMPLETED or cached is None:
        raise RuntimeError("Reservation does not contain a cached response")

    headers = dict(cached.headers)
    headers["Idempotency-Replayed"] = "true"
    headers[IDEMPOTENCY_HEADER] = reservation.context.raw_key

    return JSONResponse(
        status_code=cached.status_code,
        content=cached.body,
        headers=headers,
    )


def raise_if_idempotency_in_progress(
    reservation: IdempotencyReservation,
) -> None:
    if reservation.state is not IdempotencyState.IN_PROGRESS:
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "A request with this Idempotency-Key is still being processed"
        ),
        headers={
            "Retry-After": "2",
            IDEMPOTENCY_HEADER: reservation.context.raw_key,
        },
    )


def _serialize_response(result: Any, response_model: type[BaseModel] | None) -> Any:
    if response_model is None:
        return jsonable_encoder(result)

    validated = response_model.model_validate(result)
    return jsonable_encoder(validated)


async def execute_idempotent(
    *,
    context: IdempotencyContext,
    operation: Callable[[], Awaitable[T]],
    response_model: type[BaseModel] | None = None,
    success_status_code: int = status.HTTP_200_OK,
) -> JSONResponse:
    reservation = await reserve_idempotency_key(context)

    if reservation.state is IdempotencyState.COMPLETED:
        return replay_cached_response(reservation)

    raise_if_idempotency_in_progress(reservation)

    try:
        result = await operation()
        response_body = _serialize_response(result, response_model)
    except Exception:
        await release_idempotency_key(context)
        raise

    headers = {
        IDEMPOTENCY_HEADER: context.raw_key,
        "Idempotency-Replayed": "false",
    }

    try:
        await complete_idempotent_request(
            context,
            status_code=success_status_code,
            body=response_body,
            headers={},
        )
    except HTTPException:
        # Database sudah commit. Jangan mengubah response sukses menjadi 5xx
        # hanya karena cache replay gagal ditulis. Constraint database tetap
        # menjadi lapisan perlindungan kedua untuk business key kritis.
        logger.exception(
            "Failed to persist completed idempotency response",
            extra={
                "method": context.method,
                "path": context.path,
                "idempotency_key_hash": context.key_hash,
            },
        )
        headers["Idempotency-Cache"] = "degraded"

    return JSONResponse(
        status_code=success_status_code,
        content=response_body,
        headers=headers,
    )
