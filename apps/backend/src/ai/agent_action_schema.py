from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


AIActionProvider = Literal["gemini", "rules"]
FinancialReportType = Literal[
    "profit_loss",
    "cashflow",
    "balance_sheet",
]


class AIInvoiceDraftRequest(BaseModel):
    instruction: str = Field(min_length=8, max_length=1200)
    company_id: UUID | None = None
    branch_id: UUID | None = None
    invoice_date: date | None = None
    default_due_days: int | None = Field(default=None, ge=0, le=180)


class AIInvoiceDraft(BaseModel):
    invoice_no: str = Field(min_length=3, max_length=100)
    client_name: str = Field(min_length=2, max_length=200)
    invoice_date: date
    due_date: date | None = None
    subtotal_amount: Decimal = Field(gt=0)
    tax_rate_percent: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal = Field(gt=0)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_totals(self) -> "AIInvoiceDraft":
        expected_total = self.subtotal_amount + self.tax_amount
        if self.total_amount != expected_total:
            raise ValueError("Invoice total must equal subtotal plus tax")
        if self.due_date is not None and self.due_date < self.invoice_date:
            raise ValueError("Invoice due date cannot precede invoice date")
        return self


class AIInvoiceDraftResponse(BaseModel):
    draft_id: UUID
    action_token: str
    expires_at: datetime
    provider: AIActionProvider
    draft: AIInvoiceDraft
    warnings: list[str] = Field(default_factory=list)
    requires_confirmation: bool = True


class AIInvoiceConfirmRequest(BaseModel):
    draft_id: UUID
    action_token: str = Field(min_length=20)
    draft: AIInvoiceDraft


class AIReportDraftRequest(BaseModel):
    instruction: str = Field(min_length=5, max_length=1200)
    company_id: UUID | None = None
    branch_id: UUID | None = None
    period_start: date | None = None
    period_end: date | None = None
    report_date: date | None = None
    beginning_cash_balance: Decimal = Decimal("0.00")


class AIFinancialReportDraft(BaseModel):
    report_type: FinancialReportType
    start_date: date
    end_date: date
    report_date: date
    beginning_cash_balance: Decimal = Decimal("0.00")
    title: str = Field(min_length=3, max_length=200)

    @model_validator(mode="after")
    def validate_dates(self) -> "AIFinancialReportDraft":
        if self.end_date < self.start_date:
            raise ValueError("Report end date must be on or after start date")
        return self


class AIReportDraftResponse(BaseModel):
    draft_id: UUID
    action_token: str
    expires_at: datetime
    provider: AIActionProvider
    draft: AIFinancialReportDraft
    warnings: list[str] = Field(default_factory=list)
    requires_confirmation: bool = True


class AIReportConfirmRequest(BaseModel):
    draft_id: UUID
    action_token: str = Field(min_length=20)
    draft: AIFinancialReportDraft


class AIFinancialReportExecutionResponse(BaseModel):
    report_type: FinancialReportType
    snapshot_id: UUID
    message: str
    result: dict
