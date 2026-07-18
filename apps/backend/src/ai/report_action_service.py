from __future__ import annotations

import logging
from typing import Literal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.action_token import issue_ai_action_token, verify_ai_action_token
from src.ai.action_token_store import (
    claim_ai_action_token,
    release_ai_action_token_claim,
)
from src.ai.agent_action_common import money, resolve_ai_action_scope
from src.ai.agent_action_schema import (
    AIFinancialReportDraft,
    AIFinancialReportExecutionResponse,
    AIReportConfirmRequest,
    AIReportDraftRequest,
    AIReportDraftResponse,
)
from src.ai.gemini_provider import AIProviderFailure, gemini_provider
from src.ai.report_parser import (
    REPORT_EXTRACTION_INSTRUCTION,
    ReportExtraction,
    build_report_title,
    fallback_report_type,
)
from src.core.config import settings
from src.core.time import local_today
from src.modules.finance.schema_finance import (
    FinanceBalanceSheetSnapshotResponse,
    FinanceCashflowSnapshotResponse,
    FinanceProfitLossSnapshotResponse,
)
from src.modules.finance.service_finance import (
    FinanceBalanceSheetSnapshotService,
    FinanceCashflowSnapshotService,
    FinanceProfitLossSnapshotService,
)
from src.security.dependencies import CurrentUser


logger = logging.getLogger(__name__)


def _ensure_company_level_report_access(current_user: CurrentUser) -> None:
    if current_user.allowed_branch_ids is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Laporan keuangan AI saat ini tersedia pada level company. "
                "Akun dengan akses branch terbatas belum dapat menjalankannya."
            ),
        )


async def build_report_draft(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    payload: AIReportDraftRequest,
) -> AIReportDraftResponse:
    _ensure_company_level_report_access(current_user)
    company_id, branch_id = await resolve_ai_action_scope(
        db=db,
        current_user=current_user,
        company_id=payload.company_id,
        branch_id=payload.branch_id,
    )

    provider: Literal["gemini", "rules"] = "rules"
    warnings: list[str] = []
    report_type = fallback_report_type(payload.instruction)

    if gemini_provider.is_configured:
        try:
            extraction = await gemini_provider.extract_structured(
                prompt=payload.instruction.strip(),
                schema=ReportExtraction,
                system_instruction=REPORT_EXTRACTION_INSTRUCTION,
            )
            report_type = extraction.report_type
            provider = "gemini"
        except AIProviderFailure as exc:
            warnings.append(exc.public_message)
    else:
        warnings.append(
            "Gemini belum dikonfigurasi; jenis laporan dipilih dengan rule lokal."
        )

    today = local_today(settings.APP_TIMEZONE)
    start_date = payload.period_start or today.replace(day=1)
    end_date = payload.period_end or today
    report_date = payload.report_date or end_date

    if branch_id is not None:
        warnings.append(
            "Laporan dihitung pada level company; pilihan branch tidak "
            "digunakan dalam kalkulasi."
        )

    draft = AIFinancialReportDraft(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        report_date=report_date,
        beginning_cash_balance=money(payload.beginning_cash_balance),
        title=build_report_title(
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            report_date=report_date,
        ),
    )
    draft_id = uuid4()
    # Reports are company-level, so the token intentionally does not carry a
    # selected branch even if the UI currently has one selected.
    action_token, expires_at = issue_ai_action_token(
        action="generate_financial_report",
        draft_id=draft_id,
        user_id=current_user.user_id,
        company_id=company_id,
        branch_id=None,
    )

    return AIReportDraftResponse(
        draft_id=draft_id,
        action_token=action_token,
        expires_at=expires_at,
        provider=provider,
        draft=draft,
        warnings=warnings,
    )


async def confirm_report_draft(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    payload: AIReportConfirmRequest,
) -> AIFinancialReportExecutionResponse:
    _ensure_company_level_report_access(current_user)
    token = verify_ai_action_token(
        token=payload.action_token,
        expected_action="generate_financial_report",
        expected_draft_id=payload.draft_id,
        user_id=current_user.user_id,
    )
    company_id: UUID = token["company_id"]
    resolved_company_id, _ = await resolve_ai_action_scope(
        db=db,
        current_user=current_user,
        company_id=company_id,
        branch_id=None,
    )

    claim_key = await claim_ai_action_token(token)
    draft = payload.draft
    try:
        if draft.report_type == "profit_loss":
            snapshot = await FinanceProfitLossSnapshotService(db).generate_from_journals(
                company_id=resolved_company_id,
                period_id=None,
                start_date=draft.start_date,
                end_date=draft.end_date,
                report_date=draft.report_date,
            )
        elif draft.report_type == "cashflow":
            snapshot = await FinanceCashflowSnapshotService(db).generate_from_transactions(
                company_id=resolved_company_id,
                period_id=None,
                start_date=draft.start_date,
                end_date=draft.end_date,
                report_date=draft.report_date,
                beginning_cash_balance=draft.beginning_cash_balance,
            )
        else:
            snapshot = await FinanceBalanceSheetSnapshotService(db).generate_from_journals(
                company_id=resolved_company_id,
                period_id=None,
                report_date=draft.report_date,
            )
    except Exception:
        await release_ai_action_token_claim(claim_key)
        raise

    # Snapshot services commit before returning. Keep the token consumed if
    # response serialization fails, otherwise a retry could create duplicates.
    if draft.report_type == "profit_loss":
        result = FinanceProfitLossSnapshotResponse.model_validate(snapshot).model_dump(
            mode="json"
        )
    elif draft.report_type == "cashflow":
        result = FinanceCashflowSnapshotResponse.model_validate(snapshot).model_dump(
            mode="json"
        )
    else:
        result = FinanceBalanceSheetSnapshotResponse.model_validate(snapshot).model_dump(
            mode="json"
        )

    logger.info(
        "AI assisted financial report generated",
        extra={
            "snapshot_id": str(snapshot.id),
            "draft_id": str(payload.draft_id),
            "report_type": draft.report_type,
            "company_id": str(resolved_company_id),
            "user_id": str(current_user.user_id),
        },
    )
    safe_title = build_report_title(
        report_type=draft.report_type,
        start_date=draft.start_date,
        end_date=draft.end_date,
        report_date=draft.report_date,
    )
    return AIFinancialReportExecutionResponse(
        report_type=draft.report_type,
        snapshot_id=snapshot.id,
        message=f"{safe_title} berhasil dibuat.",
        result=result,
    )
