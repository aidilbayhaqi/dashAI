from __future__ import annotations

import hashlib
import json
from uuid import UUID

from pydantic import ValidationError

from src.core.config import settings
from src.core.redis import redis_client
from src.modules.dashboard.schema_dashboard import DashboardSummaryResponse
from src.modules.dashboard.service_dashboard import DashboardPeriod


CACHE_PREFIX = "dashboard:summary:v2"


def build_dashboard_cache_key(
    *,
    company_id: UUID | None,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
    period: DashboardPeriod,
) -> str:
    scope = {
        "company_id": str(company_id) if company_id else "all",
        "branch_id": str(exact_branch_id) if exact_branch_id else "all",
        "allowed_branch_ids": (
            sorted(str(value) for value in allowed_branch_ids)
            if allowed_branch_ids is not None
            else None
        ),
        "start": period.start_date.isoformat(),
        "end": period.end_date.isoformat(),
    }
    digest = hashlib.sha256(
        json.dumps(scope, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    company_scope = str(company_id) if company_id else "all"
    return f"{CACHE_PREFIX}:{company_scope}:{digest}"


async def get_cached_dashboard(key: str) -> DashboardSummaryResponse | None:
    try:
        raw = await redis_client.get(key)
    except Exception:
        return None
    if not raw:
        return None
    try:
        return DashboardSummaryResponse.model_validate_json(raw)
    except ValidationError:
        await redis_client.delete(key)
        return None


async def set_cached_dashboard(
    key: str,
    value: DashboardSummaryResponse,
) -> None:
    try:
        await redis_client.setex(
            key,
            settings.DASHBOARD_CACHE_TTL_SECONDS,
            value.model_dump_json(),
        )
    except Exception:
        # Cache outages must not fail the business request.
        return


async def invalidate_dashboard_cache(company_id: UUID | str | None) -> None:
    """Invalidate company and cross-company cache after a committed write."""
    scopes = {"all"}
    if company_id:
        scopes.add(str(company_id))
    try:
        keys: list[str] = []
        for scope in scopes:
            async for key in redis_client.scan_iter(
                match=f"{CACHE_PREFIX}:{scope}:*",
                count=100,
            ):
                keys.append(str(key))
        if keys:
            await redis_client.delete(*keys)
    except Exception:
        # Cache invalidation is best effort; short TTL remains a fallback.
        return
