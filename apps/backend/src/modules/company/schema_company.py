from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from src.modules.company.model_company import (
    BranchType,
    CompanyStatus,
)


# =========================================================
# BASE SCHEMA
# =========================================================


class ORMBase(BaseModel):
    model_config = {
        "from_attributes": True,
    }


# =========================================================
# COMPANY SCHEMA
# =========================================================


class CompanyCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

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

    fiscal_year_start_month: int = Field(
        default=1,
        ge=1,
        le=12,
    )

    logo_url: str | None = None

    status: CompanyStatus = CompanyStatus.ACTIVE
    is_active: bool = True


class CompanyUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

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

    fiscal_year_start_month: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )

    logo_url: str | None = None

    status: CompanyStatus | None = None
    is_active: bool | None = None


class CompanyResponse(CompanyCreate):
    model_config = {
        "from_attributes": True,
    }

    id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# COMPANY BRANCH SCHEMA
# =========================================================


class CompanyBranchCreate(BaseModel):
    code: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

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
    code: str | None = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

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


class CompanyBranchResponse(CompanyBranchCreate):
    model_config = {
        "from_attributes": True,
    }

    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# COMPANY PROVISION OWNER
# =========================================================


class CompanyProvisionOwnerCreate(BaseModel):
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    email: str = Field(
        ...,
        min_length=5,
        max_length=150,
    )

    phone: str | None = None

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    avatar_url: str | None = None

    job_title: str | None = "Owner"
    department_name: str | None = "Management"


# =========================================================
# COMPANY PROVISION USER
# =========================================================


class CompanyProvisionUserCreate(BaseModel):
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    email: str = Field(
        ...,
        min_length=5,
        max_length=150,
    )

    phone: str | None = None

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    avatar_url: str | None = None

    job_title: str | None = None
    department_name: str | None = None

    role_code: Literal[
        "admin",
        "staff",
    ] = "staff"


# =========================================================
# COMPANY PROVISION BRANCH
# =========================================================


class CompanyProvisionBranchCreate(BaseModel):
    code: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    branch_type: BranchType = BranchType.BRANCH

    email: str | None = None
    phone: str | None = None

    address_line: str | None = None
    city: str | None = None
    province: str | None = None
    country: str = "Indonesia"
    postal_code: str | None = None

    is_active: bool = True


# =========================================================
# COMPANY PROVISION REQUEST
# =========================================================


class CompanyProvisionCreate(BaseModel):
    company: CompanyCreate

    owner: CompanyProvisionOwnerCreate

    users: list[
        CompanyProvisionUserCreate
    ] = Field(
        default_factory=list,
        max_length=50,
    )

    branches: list[
        CompanyProvisionBranchCreate
    ] = Field(
        default_factory=list,
        max_length=50,
    )


# =========================================================
# COMPANY DETAIL RESPONSE
# =========================================================


class CompanyDetailUserResponse(BaseModel):
    model_config = {
        "from_attributes": True,
    }

    id: UUID

    full_name: str
    email: str
    phone: str | None = None

    role_code: str
    role_name: str

    job_title: str | None = None
    department_name: str | None = None

    is_owner: bool
    is_active: bool

    last_login_at: datetime | None = None
    created_at: datetime


class CompanyDetailResponse(BaseModel):
    company: CompanyResponse

    branches: list[
        CompanyBranchResponse
    ] = Field(
        default_factory=list,
    )

    users: list[
        CompanyDetailUserResponse
    ] = Field(
        default_factory=list,
    )

    branches_count: int = 0
    users_count: int = 0