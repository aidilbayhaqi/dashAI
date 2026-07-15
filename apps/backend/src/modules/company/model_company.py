import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.time import utc_now_naive
from src.db.base import Base


class CompanyStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class BranchType(str, enum.Enum):
    HEAD_OFFICE = "head_office"
    BRANCH = "branch"
    OUTLET = "outlet"
    WAREHOUSE = "warehouse"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    legal_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    tax_number: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(150), nullable=True)

    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(50), nullable=True)

    address_line: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="Indonesia")
    postal_code: Mapped[str | None] = mapped_column(String(30), nullable=True)

    default_currency: Mapped[str] = mapped_column(String(10), nullable=False, default="IDR")
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="Asia/Jakarta")
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[CompanyStatus] = mapped_column(
        Enum(CompanyStatus, name="company_status_enum"),
        nullable=False,
        default=CompanyStatus.ACTIVE,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
        onupdate=utc_now_naive,
    )

    branches = relationship(
        "CompanyBranch",
        back_populates="company",
        cascade="all, delete-orphan",
    )

    user_accesses = relationship(
        "UserCompanyAccess",
        back_populates="company",
        cascade="all, delete-orphan",
    )


class CompanyBranch(Base):
    __tablename__ = "company_branches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    branch_type: Mapped[BranchType] = mapped_column(
        Enum(BranchType, name="branch_type_enum"),
        nullable=False,
        default=BranchType.BRANCH,
    )

    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    address_line: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="Indonesia")
    postal_code: Mapped[str | None] = mapped_column(String(30), nullable=True)

    is_head_office: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
        onupdate=utc_now_naive,
    )

    company = relationship("Company", back_populates="branches")

    user_branch_accesses = relationship(
        "UserBranchAccess",
        back_populates="branch",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "code",
            name="uq_company_branch_company_code",
        ),
        Index("ix_company_branches_company_active", "company_id", "is_active"),
    )