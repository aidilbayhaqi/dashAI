from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal
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
    AIInvoiceConfirmRequest,
    AIInvoiceDraft,
    AIInvoiceDraftRequest,
    AIInvoiceDraftResponse,
)
from src.ai.gemini_provider import AIProviderFailure, gemini_provider
from src.ai.invoice_parser import (
    INVOICE_EXTRACTION_INSTRUCTION,
    SAFE_AI_INVOICE_NOTE,
    InvoiceExtraction,
    fallback_invoice_extraction,
)
from src.core.config import settings
from src.core.time import local_today
from src.modules.finance.model_finance import FinanceInvoice
from src.modules.finance.policy_finance import FinanceInvoiceWritePolicy
from src.modules.finance.schema_finance import FinanceInvoiceCreate
from src.security.dependencies import CurrentUser
from src.service.crud_service import CRUDService


logger = logging.getLogger(__name__)


async def build_invoice_draft(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    payload: AIInvoiceDraftRequest,
) -> AIInvoiceDraftResponse:
    company_id, branch_id = await resolve_ai_action_scope(
        db=db,
        current_user=current_user,
        company_id=payload.company_id,
        branch_id=payload.branch_id,
    )

    provider: Literal["gemini", "rules"] = "rules"
    warnings: list[str] = []
    extraction: InvoiceExtraction

    if gemini_provider.is_configured:
        try:
            extraction = await gemini_provider.extract_structured(
                prompt=payload.instruction.strip(),
                schema=InvoiceExtraction,
                system_instruction=INVOICE_EXTRACTION_INSTRUCTION,
            )
            provider = "gemini"
        except AIProviderFailure as exc:
            extraction = fallback_invoice_extraction(payload.instruction)
            warnings.append(exc.public_message)
    else:
        extraction = fallback_invoice_extraction(payload.instruction)
        warnings.append(
            "Gemini belum dikonfigurasi; draft dibuat dengan parser lokal."
        )

    if not extraction.client_name or extraction.subtotal_amount is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Instruksi invoice harus menyebut client dan nominal. "
                "Contoh: 'Buat invoice untuk PT Maju senilai 5 juta, "
                "PPN 11%, jatuh tempo 14 hari'."
            ),
        )

    invoice_date = payload.invoice_date or local_today(settings.APP_TIMEZONE)
    due_days = (
        extraction.due_days
        if extraction.due_days is not None
        else payload.default_due_days
        if payload.default_due_days is not None
        else settings.AI_INVOICE_DEFAULT_DUE_DAYS
    )

    subtotal = money(extraction.subtotal_amount)
    tax_rate = money(extraction.tax_rate_percent)
    tax_amount = money(subtotal * tax_rate / Decimal("100"))
    total = subtotal + tax_amount

    draft = AIInvoiceDraft(
        invoice_no=f"AI-{invoice_date:%Y%m%d}-{uuid4().hex[:8].upper()}",
        client_name=extraction.client_name.strip(),
        invoice_date=invoice_date,
        due_date=invoice_date + timedelta(days=due_days),
        subtotal_amount=subtotal,
        tax_rate_percent=tax_rate,
        tax_amount=tax_amount,
        total_amount=total,
        # Never persist the raw prompt automatically.
        notes=SAFE_AI_INVOICE_NOTE,
    )
    draft_id = uuid4()
    action_token, expires_at = issue_ai_action_token(
        action="create_invoice",
        draft_id=draft_id,
        user_id=current_user.user_id,
        company_id=company_id,
        branch_id=branch_id,
    )

    return AIInvoiceDraftResponse(
        draft_id=draft_id,
        action_token=action_token,
        expires_at=expires_at,
        provider=provider,
        draft=draft,
        warnings=warnings,
    )


async def confirm_invoice_draft(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    payload: AIInvoiceConfirmRequest,
):
    token = verify_ai_action_token(
        token=payload.action_token,
        expected_action="create_invoice",
        expected_draft_id=payload.draft_id,
        user_id=current_user.user_id,
    )
    company_id: UUID = token["company_id"]
    branch_id: UUID | None = token["branch_id"]

    resolved_company_id, resolved_branch_id = await resolve_ai_action_scope(
        db=db,
        current_user=current_user,
        company_id=company_id,
        branch_id=branch_id,
    )

    subtotal_amount = money(payload.draft.subtotal_amount)
    tax_rate_percent = money(payload.draft.tax_rate_percent)
    tax_amount = money(subtotal_amount * tax_rate_percent / Decimal("100"))
    total_amount = subtotal_amount + tax_amount

    invoice_payload = FinanceInvoiceCreate(
        company_id=resolved_company_id,
        branch_id=resolved_branch_id,
        invoice_no=payload.draft.invoice_no,
        client_name=payload.draft.client_name,
        invoice_date=payload.draft.invoice_date,
        due_date=payload.draft.due_date,
        subtotal_amount=subtotal_amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        paid_amount=Decimal("0.00"),
        status="draft",
        creation_mode="ai_assisted",
        notes=payload.draft.notes,
    )
    data = await FinanceInvoiceWritePolicy().before_create(
        db=db,
        data=invoice_payload.model_dump(),
        current_user=current_user,
    )
    data["creation_mode"] = "ai_assisted"

    claim_key = await claim_ai_action_token(token)
    try:
        service = CRUDService(
            db,
            FinanceInvoice,
            event_module="finance",
            event_entity="finance_invoices",
        )
        invoice = await service.create(data, event_company_id=resolved_company_id)
    except Exception:
        await release_ai_action_token_claim(claim_key)
        raise

    logger.info(
        "AI assisted invoice created",
        extra={
            "invoice_id": str(invoice.id),
            "draft_id": str(payload.draft_id),
            "company_id": str(resolved_company_id),
            "user_id": str(current_user.user_id),
        },
    )
    return invoice
