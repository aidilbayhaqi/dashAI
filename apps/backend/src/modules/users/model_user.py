import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.time import utc_now_naive
from src.db.base import Base


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    INVITED = "invited"
    SUSPENDED = "suspended"


class AccessScope(str, enum.Enum):
    COMPANY = "company"
    ALL_BRANCHES = "all_branches"
    SELECTED_BRANCHES = "selected_branches"


class PermissionAction(str, enum.Enum):
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    EXPORT = "export"
    MANAGE = "manage"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    full_name: Mapped[str] = mapped_column(String(150), nullable=False)

    email: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        unique=True,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status_enum"),
        nullable=False,
        default=UserStatus.ACTIVE,
    )

    is_superuser: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

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

    company_accesses = relationship(
        "UserCompanyAccess",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserRole(Base):
    __tablename__ = "user_roles"

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

    code: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_owner_role: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_system_role: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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

    company = relationship("Company")
    permissions = relationship(
        "UserRolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
    )

    user_accesses = relationship(
        "UserCompanyAccess",
        back_populates="role",
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "code",
            name="uq_user_role_company_code",
        ),
        Index("ix_user_roles_company_active", "company_id", "is_active"),
    )


class UserPermission(Base):
    __tablename__ = "user_permissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    module_code: Mapped[str] = mapped_column(String(80), nullable=False)
    feature_code: Mapped[str] = mapped_column(String(100), nullable=False)

    action: Mapped[PermissionAction] = mapped_column(
        Enum(PermissionAction, name="user_permission_action_enum"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
    )

    role_permissions = relationship(
        "UserRolePermission",
        back_populates="permission",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "module_code",
            "feature_code",
            "action",
            name="uq_user_permission_module_feature_action",
        ),
        Index("ix_user_permissions_module_feature", "module_code", "feature_code"),
    )


class UserRolePermission(Base):
    __tablename__ = "user_role_permissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_permissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
    )

    role = relationship("UserRole", back_populates="permissions")
    permission = relationship("UserPermission", back_populates="role_permissions")

    __table_args__ = (
        UniqueConstraint(
            "role_id",
            "permission_id",
            name="uq_user_role_permission",
        ),
    )


class UserCompanyAccess(Base):
    __tablename__ = "user_company_accesses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    default_branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_branches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    access_scope: Mapped[AccessScope] = mapped_column(
        Enum(AccessScope, name="user_access_scope_enum"),
        nullable=False,
        default=AccessScope.COMPANY,
    )

    job_title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    department_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    is_owner: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    invited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

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

    user = relationship("User", back_populates="company_accesses")
    company = relationship("Company", back_populates="user_accesses")
    role = relationship("UserRole", back_populates="user_accesses")
    default_branch = relationship("CompanyBranch", foreign_keys=[default_branch_id])

    branch_accesses = relationship(
        "UserBranchAccess",
        back_populates="company_access",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "company_id",
            name="uq_user_company_access_user_company",
        ),
        Index("ix_user_company_access_company_active", "company_id", "is_active"),
        Index("ix_user_company_access_user_active", "user_id", "is_active"),
    )


class UserBranchAccess(Base):
    __tablename__ = "user_branch_accesses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_access_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_company_accesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    branch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    can_manage_branch: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
    )

    company_access = relationship("UserCompanyAccess", back_populates="branch_accesses")
    branch = relationship("CompanyBranch", back_populates="user_branch_accesses")

    __table_args__ = (
        UniqueConstraint(
            "company_access_id",
            "branch_id",
            name="uq_user_branch_access",
        ),
    )