from __future__ import annotations

import logging
from time import perf_counter
from typing import Literal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from pydantic import ValidationError
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
from src.ai.audit_service import build_success_audit, record_failure_audit_safe
from src.ai.errors import ai_validation_http_exception
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
from src.realtime.events import publish_realtime_event_safe
from src.security.dependencies import CurrentUser
from src.service.domain_integrity import commit_or_raise


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


def _unknown_report_type_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=(
            "Jenis laporan tidak dikenali. Gunakan salah satu: "
            "laporan laba rugi, arus kas, atau neraca."
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

    if report_type is None:
        raise _unknown_report_type_error()

    today = local_today(settings.APP_TIMEZONE)
    start_date = payload.period_start or today.replace(day=1)
    end_date = payload.period_end or today
    report_date = payload.report_date or end_date

    if branch_id is not None:
        warnings.append(
            "Laporan dihitung pada level company; pilihan branch tidak "
            "digunakan dalam kalkulasi."
        )

    try:
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
    except ValidationError as exc:
        raise ai_validation_http_exception(
            exc,
            message=(
                "Periode laporan belum valid. Tanggal akhir tidak boleh "
                "lebih awal daripada tanggal mulai."
            ),
        ) from exc

    draft_id = uuid4()
    action_token, expires_at = issue_ai_action_token(
        action="generate_financial_report",
        draft_id=draft_id,
        user_id=current_user.user_id,
        company_id=company_id,
        branch_id=None,
        provider=provider,
    )

    return AIReportDraftResponse(
        draft_id=draft_id,
        action_token=action_token,
        expires_at=expires_at,
        provider=provider,
        draft=draft,
        warnings=warnings,
    )


async def _generate_report_snapshot(
    *,
    db: AsyncSession,
    company_id: UUID,
    draft: AIFinancialReportDraft,
):
    if draft.report_type == "profit_loss":
        return await FinanceProfitLossSnapshotService(db).generate_from_journals(
            company_id=company_id,
            period_id=None,
            start_date=draft.start_date,
            end_date=draft.end_date,
            report_date=draft.report_date,
            commit=False,
            publish_event=False,
        )
    if draft.report_type == "cashflow":
        return await FinanceCashflowSnapshotService(db).generate_from_transactions(
            company_id=company_id,
            period_id=None,
            start_date=draft.start_date,
            end_date=draft.end_date,
            report_date=draft.report_date,
            beginning_cash_balance=draft.beginning_cash_balance,
            commit=False,
            publish_event=False,
        )
    return await FinanceBalanceSheetSnapshotService(db).generate_from_journals(
        company_id=company_id,
        period_id=None,
        report_date=draft.report_date,
        commit=False,
        publish_event=False,
    )


async def _publish_report_event(
    *, company_id: UUID, draft: AIFinancialReportDraft, snapshot
) -> None:
    event_type = {
        "profit_loss": "finance.profit_loss.generated",
        "cashflow": "finance.cashflow.generated",
        "balance_sheet": "finance.balance_sheet.generated",
    }[draft.report_type]
    await publish_realtime_event_safe(
        event_type,
        {
            "snapshot_id": str(snapshot.id),
            "report_date": snapshot.report_date.isoformat(),
        },
        company_id=company_id,
        module="finance",
    )


async def confirm_report_draft(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    payload: AIReportConfirmRequest,
) -> AIFinancialReportExecutionResponse:
    started_at = perf_counter()
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
    committed = False
    draft = payload.draft
    try:
        snapshot = await _generate_report_snapshot(
            db=db,
            company_id=resolved_company_id,
            draft=draft,
        )
        if draft.report_type == "profit_loss":
            result = FinanceProfitLossSnapshotResponse.model_validate(
                snapshot
            ).model_dump(mode="json")
        elif draft.report_type == "cashflow":
            result = FinanceCashflowSnapshotResponse.model_validate(
                snapshot
            ).model_dump(mode="json")
        else:
            result = FinanceBalanceSheetSnapshotResponse.model_validate(
                snapshot
            ).model_dump(mode="json")

        safe_title = build_report_title(
            report_type=draft.report_type,
            start_date=draft.start_date,
            end_date=draft.end_date,
            report_date=draft.report_date,
        )
        response = AIFinancialReportExecutionResponse(
            report_type=draft.report_type,
            snapshot_id=snapshot.id,
            message=f"{safe_title} berhasil dibuat.",
            result=result,
        )

        audit = build_success_audit(
            action_type="generate_financial_report",
            token_payload=token,
            user_id=current_user.user_id,
            request_payload=draft,
            target_type=f"finance_{draft.report_type}_snapshot",
            target_id=snapshot.id,
            duration_ms=int((perf_counter() - started_at) * 1000),
            details={"report_type": draft.report_type},
        )
        db.add(audit)
        await commit_or_raise(db)
        committed = True
    except Exception as exc:
        if not committed:
            await db.rollback()
            await release_ai_action_token_claim(claim_key)
        await record_failure_audit_safe(
            action_type="generate_financial_report",
            token_payload=token,
            user_id=current_user.user_id,
            request_payload=draft,
            duration_ms=int((perf_counter() - started_at) * 1000),
            error=exc,
        )
        raise

    await _publish_report_event(
        company_id=resolved_company_id,
        draft=draft,
        snapshot=snapshot,
    )


    logger.info(
        "AI assisted financial report generated",
        extra={
            "snapshot_id": str(snapshot.id),
            "draft_id": str(payload.draft_id),
            "report_type": draft.report_type,
            "company_id": str(resolved_company_id),
            "user_id": str(current_user.user_id),
            "provider": token.get("provider"),
            "duration_ms": int((perf_counter() - started_at) * 1000),
        },
    )
    return response
