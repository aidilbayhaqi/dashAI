from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from src.modules.crm.model_crm import CRMActivityStatus, CRMActivityType, DealStage, LeadStatus, CampaignStatus


class ORMBase(BaseModel):
    model_config = {"from_attributes": True}


class CRMLeadCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    owner_user_id: UUID | None = None
    name: str
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    estimated_value: Decimal = Decimal("0.00")
    notes: str | None = None


class CRMLeadUpdate(BaseModel):
    owner_user_id: UUID | None = None
    name: str | None = None
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    status: LeadStatus | None = None
    score: int | None = None
    estimated_value: Decimal | None = None
    next_follow_up_at: datetime | None = None
    notes: str | None = None


class CRMLeadResponse(CRMLeadCreate, ORMBase):
    id: UUID
    status: LeadStatus
    score: int
    next_follow_up_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CRMContactCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    lead_id: UUID | None = None
    owner_user_id: UUID | None = None
    name: str
    company_name: str | None = None
    position: str | None = None
    email: str | None = None
    phone: str | None = None


class CRMContactResponse(CRMContactCreate, ORMBase):
    id: UUID
    created_at: datetime


class CRMDealCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    lead_id: UUID | None = None
    contact_id: UUID | None = None
    owner_user_id: UUID | None = None
    title: str
    expected_value: Decimal = Decimal("0.00")
    probability_percent: Decimal = Decimal("0.0000")
    expected_close_date: date | None = None


class CRMDealUpdate(BaseModel):
    stage: DealStage | None = None
    expected_value: Decimal | None = None
    probability_percent: Decimal | None = None
    expected_close_date: date | None = None
    won_lost_reason: str | None = None


class CRMDealResponse(CRMDealCreate, ORMBase):
    id: UUID
    stage: DealStage
    closed_at: datetime | None
    won_lost_reason: str | None
    finance_transaction_id: UUID | None
    invoice_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class CRMDealItemCreate(BaseModel):
    deal_id: UUID
    product_id: UUID | None = None
    description: str | None = None
    quantity: Decimal = Decimal("1.0000")
    unit_price: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")


class CRMDealItemResponse(CRMDealItemCreate, ORMBase):
    id: UUID
    total_amount: Decimal


class CRMActivityCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    lead_id: UUID | None = None
    contact_id: UUID | None = None
    deal_id: UUID | None = None
    assigned_user_id: UUID | None = None
    activity_type: CRMActivityType
    subject: str
    due_at: datetime | None = None
    notes: str | None = None


class CRMActivityUpdate(BaseModel):
    status: CRMActivityStatus | None = None
    completed_at: datetime | None = None
    notes: str | None = None


class CRMActivityResponse(CRMActivityCreate, ORMBase):
    id: UUID
    status: CRMActivityStatus
    completed_at: datetime | None
    created_at: datetime

class CRMCampaignCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    name: str
    channel: str | None = None
    budget_amount: Decimal = Decimal("0.00")
    leads_count: int = 0
    start_date: date | None = None
    end_date: date | None = None
    status: CampaignStatus = CampaignStatus.DRAFT
    notes: str | None = None


class CRMCampaignUpdate(BaseModel):
    branch_id: UUID | None = None
    name: str | None = None
    channel: str | None = None
    budget_amount: Decimal | None = None
    leads_count: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: CampaignStatus | None = None
    notes: str | None = None


class CRMCampaignResponse(CRMCampaignCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

class CRMDealPaymentRequest(BaseModel):
    cash_account_id: UUID | None = None
    payment_date: date | None = None
    reference_no: str | None = None
    notes: str | None = None
