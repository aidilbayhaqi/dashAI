from __future__ import annotations

import hashlib
import json
import logging
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel

from src.ai.model_ai import AIActionAudit
from src.core.time import utc_now_naive
from src.db.database import AsyncSessionLocal
from src.service.domain_integrity import commit_or_raise


logger = logging.getLogger(__name__)


def _json_safe(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return value




def safe_failure_details(error: Exception) -> tuple[str, str]:
    """Return an audit-safe error code and redacted message."""

    if isinstance(error, HTTPException):
        return str(error.status_code), str(error.detail)
    return type(error).__name__, "Internal AI action failure"


def request_fingerprint(value: Any) -> str:
    serialized = json.dumps(
        _json_safe(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def build_success_audit(
    *,
    action_type: str,
    token_payload: dict[str, Any],
    user_id: UUID,
    request_payload: Any,
    target_type: str,
    target_id: UUID,
    duration_ms: int,
    details: dict[str, Any] | None = None,
) -> AIActionAudit:
    return AIActionAudit(
        company_id=token_payload["company_id"],
        branch_id=token_payload.get("branch_id"),
        user_id=user_id,
        draft_id=token_payload["draft_id"],
        token_jti=UUID(str(token_payload["jti"])),
        action_type=action_type,
        provider=token_payload.get("provider"),
        status="succeeded",
        target_type=target_type,
        target_id=target_id,
        request_fingerprint=request_fingerprint(request_payload),
        duration_ms=max(duration_ms, 0),
        details=_json_safe(details or {}),
        completed_at=utc_now_naive(),
    )


async def record_failure_audit_safe(
    *,
    action_type: str,
    token_payload: dict[str, Any],
    user_id: UUID,
    request_payload: Any,
    duration_ms: int,
    error: Exception,
) -> None:
    """Persist a redacted failure audit in an independent transaction."""

    # Database/provider errors may contain connection details or request
    # fragments. Only expected HTTP errors keep their public message; full
    # stack traces remain in application logs under the request ID.
    error_code, message = safe_failure_details(error)
    audit = AIActionAudit(
        company_id=token_payload["company_id"],
        branch_id=token_payload.get("branch_id"),
        user_id=user_id,
        draft_id=token_payload["draft_id"],
        token_jti=UUID(str(token_payload["jti"])),
        action_type=action_type,
        provider=token_payload.get("provider"),
        status="failed",
        request_fingerprint=request_fingerprint(request_payload),
        duration_ms=max(duration_ms, 0),
        error_code=error_code[:100],
        error_message=message[:2000],
        details={},
        completed_at=utc_now_naive(),
    )

    try:
        async with AsyncSessionLocal() as session:
            session.add(audit)
            await commit_or_raise(session)
    except Exception:
        logger.exception("Failed to persist AI action failure audit")
