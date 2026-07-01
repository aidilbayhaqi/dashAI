from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from src.modules.company.model_company import BranchType, CompanyStatus


class ORMBase(BaseModel):
    model_config = {
        "from_attributes": True
    }


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    legal_name: str | None = None
    tax_number: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    industry: str | None = None
    company_size: str | None = None
    address_line: str | None = None
    city: str | None = None
    province: str | None = None
    country: str = "Indonesia"
    postal_code: str | None = None
    default_currency: str = "IDR"
    timezone: str = "Asia/Jakarta"
    fiscal_year_start_month: int = 1
    logo_url: str | None = None
    status: CompanyStatus = CompanyStatus.ACTIVE
    is_active: bool = True


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    legal_name: str | None = None
    tax_number: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    industry: str | None = None
    company_size: str | None = None
    address_line: str | None = None
    city: str | None = None
    province: str | None = None
    country: str | None = None
    postal_code: str | None = None
    default_currency: str | None = None
    timezone: str | None = None
    fiscal_year_start_month: int | None = None
    logo_url: str | None = None
    status: CompanyStatus | None = None
    is_active: bool | None = None


class CompanyResponse(CompanyCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class CompanyBranchCreate(BaseModel):
    code: str
    name: str
    branch_type: BranchType = BranchType.BRANCH
    email: str | None = None
    phone: str | None = None
    address_line: str | None = None
    city: str | None = None
    province: str | None = None
    country: str = "Indonesia"
    postal_code: str | None = None
    is_head_office: bool = False
    is_active: bool = True


class CompanyBranchUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    branch_type: BranchType | None = None
    email: str | None = None
    phone: str | None = None
    address_line: str | None = None
    city: str | None = None
    province: str | None = None
    country: str | None = None
    postal_code: str | None = None
    is_head_office: bool | None = None
    is_active: bool | None = None


class CompanyBranchResponse(CompanyBranchCreate, ORMBase):
    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime