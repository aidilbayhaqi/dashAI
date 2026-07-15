from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.dashboard.cache_dashboard import (
    build_dashboard_cache_key,
    get_cached_dashboard,
    set_cached_dashboard,
)
from src.modules.dashboard.schema_dashboard import DashboardSummaryResponse
from src.modules.dashboard.service_dashboard import (
    DashboardPeriod,
    apply_branch_scope,
    build_dashboard_summary,
    build_revenue_query,
    filter_dashboard_summary_for_permissions,
    calculate_revenue_change_percent,
    resolve_dashboard_period,
)
from src.security.dependencies import CurrentUser, require_permission
from src.security.permissions import DASHBOARD_SUMMARY_VIEW
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    resolve_branch_query_scope,
    resolve_company_id,
)


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary(
    company_id: UUID | None = Query(default=None),
    branch_id: UUID | None = Query(default=None),
    period_start: date | None = Query(default=None),
    period_end: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission(DASHBOARD_SUMMARY_VIEW)
    ),
):
    effective_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    effective_branch_id, allowed_branch_ids = resolve_branch_query_scope(
        current_user=current_user,
        requested_branch_id=branch_id,
    )

    if effective_branch_id is not None and effective_company_id is not None:
        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=effective_branch_id,
            company_id=effective_company_id,
            current_user=current_user,
        )

    period = resolve_dashboard_period(
        period_start=period_start,
        period_end=period_end,
    )

    cache_key = build_dashboard_cache_key(
        company_id=effective_company_id,
        exact_branch_id=effective_branch_id,
        allowed_branch_ids=allowed_branch_ids,
        period=period,
    )
    summary = await get_cached_dashboard(cache_key)
    if summary is None:
        summary = await build_dashboard_summary(
            db=db,
            company_id=effective_company_id,
            exact_branch_id=effective_branch_id,
            allowed_branch_ids=allowed_branch_ids,
            period=period,
        )
        await set_cached_dashboard(cache_key, summary)

    return filter_dashboard_summary_for_permissions(
        summary,
        permissions=current_user.permissions,
        is_superuser=current_user.is_superuser,
    )


__all__ = [
    "DashboardPeriod",
    "apply_branch_scope",
    "build_revenue_query",
    "calculate_revenue_change_percent",
    "resolve_dashboard_period",
]
