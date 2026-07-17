from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Literal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.action_token import issue_ai_action_token, verify_ai_action_token
from src.ai.agent_action_schema import (
    AIFinancialReportDraft,
    AIFinancialReportExecutionResponse,
    AIInvoiceDraft,
    AIInvoiceDraftRequest,
    AIInvoiceDraftResponse,
    AIInvoiceConfirmRequest,
    AIReportConfirmRequest,
    AIReportDraftRequest,
    AIReportDraftResponse,
    FinancialReportType,
)
from src.ai.gemini_provider import AIProviderFailure, gemini_provider
from src.core.config import settings
from src.modules.finance.model_finance import FinanceInvoice
from src.modules.finance.policy_finance import FinanceInvoiceWritePolicy
from src.modules.finance.schema_finance import (
    FinanceBalanceSheetSnapshotResponse,
    FinanceCashflowSnapshotResponse,
    FinanceInvoiceCreate,
    FinanceProfitLossSnapshotResponse,
)
from src.modules.finance.service_finance import (
    FinanceBalanceSheetSnapshotService,
    FinanceCashflowSnapshotService,
    FinanceProfitLossSnapshotService,
)
from src.security.dependencies import CurrentUser
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    resolve_branch_query_scope,
    resolve_company_id,
)
from src.service.crud_service import CRUDService


logger = logging.getLogger(__name__)
MONEY_QUANT = Decimal("0.01")


class InvoiceExtraction(BaseModel):
    client_name: str | None = Field(default=None, max_length=200)
    subtotal_amount: Decimal | None = Field(default=None, gt=0)
    tax_rate_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    due_days: int | None = Field(default=None, ge=0, le=180)
    notes: str | None = Field(default=None, max_length=500)


class ReportExtraction(BaseModel):
    report_type: Literal[
        "profit_loss",
        "cashflow",
        "balance_sheet",
    ]


INVOICE_EXTRACTION_INSTRUCTION = """
Ekstrak instruksi invoice berbahasa Indonesia menjadi data terstruktur.
Jangan mengarang client atau nominal. Nominal harus berupa Rupiah numerik.
Jika pajak tidak disebutkan, gunakan 0. Jika jatuh tempo tidak disebutkan,
kembalikan null. Notes harus singkat dan tidak berisi data internal aplikasi.
"""

REPORT_EXTRACTION_INSTRUCTION = """
Klasifikasikan permintaan laporan keuangan menjadi tepat satu jenis:
profit_loss untuk laba rugi, cashflow untuk arus kas, atau balance_sheet
untuk neraca. Jangan menghasilkan jenis lain.
"""


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def _parse_indonesian_amount(raw_value: str, suffix: str | None) -> Decimal | None:
    normalized = raw_value.strip().lower().replace(" ", "")
    multiplier = Decimal("1")

    if suffix in {"juta", "jt"}:
        multiplier = Decimal("1000000")
    elif suffix in {"ribu", "rb", "k"}:
        multiplier = Decimal("1000")

    try:
        if multiplier != 1:
            normalized = normalized.replace(".", "").replace(",", ".")
            return _money(Decimal(normalized) * multiplier)

        # Rupiah amounts are normally whole numbers. Treat dots/commas as
        # thousand separators unless the value clearly uses decimal cents.
        if re.fullmatch(r"\d+[,.]\d{1,2}", normalized):
            normalized = normalized.replace(",", ".")
        else:
            normalized = normalized.replace(".", "").replace(",", "")

        return _money(Decimal(normalized))
    except (InvalidOperation, ValueError):
        return None


def _fallback_invoice_extraction(instruction: str) -> InvoiceExtraction:
    compact = " ".join(instruction.strip().split())
    amount_pattern = re.compile(
        r"(?:rp\s*)?(\d[\d.,]*)(?:\s*(juta|jt|ribu|rb|k))?",
        re.IGNORECASE,
    )

    contextual_amount = re.search(
        r"(?:senilai|sebesar|sejumlah|nominal|total)\s+"
        r"(?:rp\s*)?(\d[\d.,]*)(?:\s*(juta|jt|ribu|rb|k))?",
        compact,
        re.IGNORECASE,
    )
    amount_match = contextual_amount or amount_pattern.search(compact)
    subtotal = (
        _parse_indonesian_amount(amount_match.group(1), amount_match.group(2))
        if amount_match
        else None
    )

    client_match = re.search(
        r"(?:untuk|kepada|client|pelanggan)\s+(.+?)"
        r"(?=\s+(?:senilai|sebesar|sejumlah|nominal|total|dengan|pajak|jatuh)\b|[,.;]|$)",
        compact,
        re.IGNORECASE,
    )
    client_name = client_match.group(1).strip(" -") if client_match else None

    tax_match = re.search(
        r"(?:pajak|ppn)\s*(\d+(?:[.,]\d+)?)\s*%",
        compact,
        re.IGNORECASE,
    )
    tax_rate = Decimal("0")
    if tax_match:
        tax_rate = Decimal(tax_match.group(1).replace(",", "."))

    due_match = re.search(
        r"(?:jatuh\s*tempo|tempo)\s*(\d+)\s*hari",
        compact,
        re.IGNORECASE,
    )

    return InvoiceExtraction(
        client_name=client_name,
        subtotal_amount=subtotal,
        tax_rate_percent=tax_rate,
        due_days=int(due_match.group(1)) if due_match else None,
        notes=f"Dibuat dengan bantuan AI dari instruksi: {compact[:380]}",
    )


def _fallback_report_type(instruction: str) -> FinancialReportType:
    normalized = instruction.lower()
    if any(keyword in normalized for keyword in ("cashflow", "cash flow", "arus kas")):
        return "cashflow"
    if any(keyword in normalized for keyword in ("neraca", "balance sheet", "posisi keuangan")):
        return "balance_sheet"
    return "profit_loss"


async def _resolve_scope(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    company_id: UUID | None,
    branch_id: UUID | None,
) -> tuple[UUID, UUID | None]:
    effective_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=company_id,
        required_for_superuser=True,
    )
    if effective_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Company harus dipilih.",
        )

    effective_branch_id, _ = resolve_branch_query_scope(
        current_user=current_user,
        requested_branch_id=branch_id,
    )
    if effective_branch_id is not None:
        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=effective_branch_id,
            company_id=effective_company_id,
            current_user=current_user,
        )

    return effective_company_id, effective_branch_id


async def build_invoice_draft(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    payload: AIInvoiceDraftRequest,
) -> AIInvoiceDraftResponse:
    company_id, branch_id = await _resolve_scope(
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
            extraction = _fallback_invoice_extraction(payload.instruction)
            warnings.append(exc.public_message)
    else:
        extraction = _fallback_invoice_extraction(payload.instruction)
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

    invoice_date = payload.invoice_date or date.today()
    due_days = (
        extraction.due_days
        if extraction.due_days is not None
        else payload.default_due_days
        if payload.default_due_days is not None
        else settings.AI_INVOICE_DEFAULT_DUE_DAYS
    )
    subtotal = _money(extraction.subtotal_amount)
    tax_rate = _money(extraction.tax_rate_percent)
    tax_amount = _money(subtotal * tax_rate / Decimal("100"))
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
        notes=extraction.notes,
    )
    action_token, expires_at = issue_ai_action_token(
        action="create_invoice",
        user_id=current_user.user_id,
        company_id=company_id,
        branch_id=branch_id,
    )

    return AIInvoiceDraftResponse(
        draft_id=uuid4(),
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
        user_id=current_user.user_id,
    )
    company_id: UUID = token["company_id"]
    branch_id: UUID | None = token["branch_id"]

    resolved_company_id, resolved_branch_id = await _resolve_scope(
        db=db,
        current_user=current_user,
        company_id=company_id,
        branch_id=branch_id,
    )

    # The confirmation payload is editable by the user, so monetary totals
    # are always recalculated by the backend instead of trusting the browser.
    subtotal_amount = _money(payload.draft.subtotal_amount)
    tax_rate_percent = _money(payload.draft.tax_rate_percent)
    tax_amount = _money(
        subtotal_amount * tax_rate_percent / Decimal("100")
    )
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

    service = CRUDService(
        db,
        FinanceInvoice,
        event_module="finance",
        event_entity="finance_invoices",
    )
    invoice = await service.create(
        data,
        event_company_id=resolved_company_id,
    )
    logger.info(
        "AI assisted invoice created",
        extra={
            "invoice_id": str(invoice.id),
            "company_id": str(resolved_company_id),
            "user_id": str(current_user.user_id),
        },
    )
    return invoice


async def build_report_draft(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    payload: AIReportDraftRequest,
) -> AIReportDraftResponse:
    company_id, branch_id = await _resolve_scope(
        db=db,
        current_user=current_user,
        company_id=payload.company_id,
        branch_id=payload.branch_id,
    )

    provider: Literal["gemini", "rules"] = "rules"
    warnings: list[str] = []
    report_type = _fallback_report_type(payload.instruction)

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

    today = date.today()
    start_date = payload.period_start or today.replace(day=1)
    end_date = payload.period_end or today
    report_date = payload.report_date or end_date

    if branch_id is not None:
        warnings.append(
            "Snapshot laporan keuangan saat ini dihitung pada level company; "
            "branch terpilih tidak mengubah kalkulasi report."
        )

    title_map = {
        "profit_loss": "Laporan Laba Rugi",
        "cashflow": "Laporan Arus Kas",
        "balance_sheet": "Neraca",
    }
    draft = AIFinancialReportDraft(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        report_date=report_date,
        beginning_cash_balance=_money(payload.beginning_cash_balance),
        title=f"{title_map[report_type]} {start_date:%d/%m/%Y} - {end_date:%d/%m/%Y}",
    )
    action_token, expires_at = issue_ai_action_token(
        action="generate_financial_report",
        user_id=current_user.user_id,
        company_id=company_id,
        branch_id=branch_id,
    )

    return AIReportDraftResponse(
        draft_id=uuid4(),
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
    token = verify_ai_action_token(
        token=payload.action_token,
        expected_action="generate_financial_report",
        user_id=current_user.user_id,
    )
    company_id: UUID = token["company_id"]
    branch_id: UUID | None = token["branch_id"]
    resolved_company_id, _ = await _resolve_scope(
        db=db,
        current_user=current_user,
        company_id=company_id,
        branch_id=branch_id,
    )

    draft = payload.draft
    if draft.report_type == "profit_loss":
        snapshot = await FinanceProfitLossSnapshotService(db).generate_from_journals(
            company_id=resolved_company_id,
            period_id=None,
            start_date=draft.start_date,
            end_date=draft.end_date,
            report_date=draft.report_date,
        )
        result = FinanceProfitLossSnapshotResponse.model_validate(snapshot).model_dump(
            mode="json"
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
        result = FinanceCashflowSnapshotResponse.model_validate(snapshot).model_dump(
            mode="json"
        )
    else:
        snapshot = await FinanceBalanceSheetSnapshotService(db).generate_from_journals(
            company_id=resolved_company_id,
            period_id=None,
            report_date=draft.report_date,
        )
        result = FinanceBalanceSheetSnapshotResponse.model_validate(snapshot).model_dump(
            mode="json"
        )

    logger.info(
        "AI assisted financial report generated",
        extra={
            "snapshot_id": str(snapshot.id),
            "report_type": draft.report_type,
            "company_id": str(resolved_company_id),
            "user_id": str(current_user.user_id),
        },
    )
    return AIFinancialReportExecutionResponse(
        report_type=draft.report_type,
        snapshot_id=snapshot.id,
        message=f"{draft.title} berhasil dibuat.",
        result=result,
    )
