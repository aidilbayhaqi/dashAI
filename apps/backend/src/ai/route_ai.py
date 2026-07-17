from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.rate_limit import enforce_ai_rate_limit
from src.ai.agent_action_schema import (
    AIFinancialReportExecutionResponse,
    AIInvoiceConfirmRequest,
    AIInvoiceDraftRequest,
    AIInvoiceDraftResponse,
    AIReportConfirmRequest,
    AIReportDraftRequest,
    AIReportDraftResponse,
)
from src.ai.agent_action_service import (
    build_invoice_draft,
    build_report_draft,
    confirm_invoice_draft,
    confirm_report_draft,
)
from src.ai.schema_ai import (
    AIAnalyticsAnswerResponse,
    AIAnalyticsQuestionRequest,
    AIAnalyticsSummaryResponse,
)
from src.ai.service_ai import (
    build_rule_based_answer,
    build_rule_based_summary,
    maybe_enhance_answer_with_provider,
)
from src.core.config import settings
from src.db.database import get_db
from src.modules.finance.schema_finance import FinanceInvoiceResponse
from src.security.idempotency import (
    build_idempotency_context,
    execute_idempotent,
    get_idempotency_key,
)
from src.modules.dashboard.cache_dashboard import (
    build_dashboard_cache_key,
    get_cached_dashboard,
    set_cached_dashboard,
)
from src.modules.dashboard.service_dashboard import (
    build_dashboard_summary,
    filter_dashboard_summary_for_permissions,
    resolve_dashboard_period,
)
from src.security.dependencies import (
    CurrentUser,
    require_all_permissions,
    require_permission,
)
from src.security.permissions import AI_ANALYTICS_VIEW
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    resolve_branch_query_scope,
    resolve_company_id,
)

from src.ai.gemini_agent_service import (
    run_gemini_erp_agent,
)
from src.ai.gemini_schema import (
    GeminiAgentChatResponse,
    GeminiAgentQuestionRequest,
)

router = APIRouter(prefix="/ai/analytics", tags=["AI Analytics"])


async def _resolve_dashboard(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    company_id: UUID | None,
    branch_id: UUID | None,
    period_start: date | None,
    period_end: date | None,
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


@router.get("/summary", response_model=AIAnalyticsSummaryResponse)
async def ai_analytics_summary(
    company_id: UUID | None = Query(default=None),
    branch_id: UUID | None = Query(default=None),
    period_start: date | None = Query(default=None),
    period_end: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission(AI_ANALYTICS_VIEW)
    ),
):
    dashboard = await _resolve_dashboard(
        db=db,
        current_user=current_user,
        company_id=company_id,
        branch_id=branch_id,
        period_start=period_start,
        period_end=period_end,
    )
    return build_rule_based_summary(dashboard)


@router.post("/ask", response_model=AIAnalyticsAnswerResponse)
async def ask_ai_analytics(
    payload: AIAnalyticsQuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission(AI_ANALYTICS_VIEW)
    ),
):
    await enforce_ai_rate_limit(current_user.user_id)
    question = payload.question.strip()
    if len(question) > settings.AI_MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Question cannot exceed {settings.AI_MAX_QUESTION_LENGTH} characters"
            ),
        )

    dashboard = await _resolve_dashboard(
        db=db,
        current_user=current_user,
        company_id=payload.company_id,
        branch_id=payload.branch_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )
    response = build_rule_based_answer(question, dashboard)
    return await maybe_enhance_answer_with_provider(response, dashboard)

@router.post(
    "/agent/chat",
    response_model=GeminiAgentChatResponse,
)
async def chat_with_gemini_agent(
    payload: GeminiAgentQuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission(
            AI_ANALYTICS_VIEW
        )
    ),
):
    if not settings.AI_AGENT_ENABLED:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail="AI Agent belum diaktifkan.",
        )

    await enforce_ai_rate_limit(
        current_user.user_id
    )

    effective_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=(
            payload.company_id
        ),
        required_for_superuser=True,
    )

    if effective_company_id is None:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail="Company harus dipilih.",
        )

    (
        effective_branch_id,
        allowed_branch_ids,
    ) = resolve_branch_query_scope(
        current_user=current_user,
        requested_branch_id=(
            payload.branch_id
        ),
    )

    if effective_branch_id is not None:
        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=effective_branch_id,
            company_id=effective_company_id,
            current_user=current_user,
        )

    period = resolve_dashboard_period(
        period_start=payload.period_start,
        period_end=payload.period_end,
    )

    return await run_gemini_erp_agent(
        db=db,
        current_user=current_user,
        company_id=effective_company_id,
        branch_id=effective_branch_id,
        allowed_branch_ids=allowed_branch_ids,
        period=period,
        question=payload.question.strip(),
    )



def _ensure_ai_actions_enabled() -> None:
    if not settings.AI_AGENT_ACTIONS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI assisted actions belum diaktifkan.",
        )


@router.post(
    "/agent/invoice/draft",
    response_model=AIInvoiceDraftResponse,
)
async def draft_invoice_with_ai(
    payload: AIInvoiceDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_all_permissions(
            AI_ANALYTICS_VIEW,
            "finance.invoices.create",
        )
    ),
):
    _ensure_ai_actions_enabled()
    await enforce_ai_rate_limit(current_user.user_id)
    return await build_invoice_draft(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.post(
    "/agent/invoice/confirm",
    response_model=FinanceInvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def confirm_ai_invoice(
    payload: AIInvoiceConfirmRequest,
    request: Request,
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_all_permissions(
            AI_ANALYTICS_VIEW,
            "finance.invoices.create",
        )
    ),
):
    _ensure_ai_actions_enabled()
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        return await confirm_invoice_draft(
            db=db,
            current_user=current_user,
            payload=payload,
        )

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=FinanceInvoiceResponse,
        success_status_code=status.HTTP_201_CREATED,
    )


@router.post(
    "/agent/report/draft",
    response_model=AIReportDraftResponse,
)
async def draft_financial_report_with_ai(
    payload: AIReportDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_all_permissions(
            AI_ANALYTICS_VIEW,
            "finance.snapshots.approve",
        )
    ),
):
    _ensure_ai_actions_enabled()
    await enforce_ai_rate_limit(current_user.user_id)
    return await build_report_draft(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.post(
    "/agent/report/confirm",
    response_model=AIFinancialReportExecutionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def confirm_ai_financial_report(
    payload: AIReportConfirmRequest,
    request: Request,
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_all_permissions(
            AI_ANALYTICS_VIEW,
            "finance.snapshots.approve",
        )
    ),
):
    _ensure_ai_actions_enabled()
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        return await confirm_report_draft(
            db=db,
            current_user=current_user,
            payload=payload,
        )

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=AIFinancialReportExecutionResponse,
        success_status_code=status.HTTP_201_CREATED,
    )
