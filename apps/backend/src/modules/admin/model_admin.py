import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class SettingStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    key: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="general")
    value: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[SettingStatus] = mapped_column(
        Enum(SettingStatus, name="system_setting_status_enum"),
        nullable=False,
        default=SettingStatus.ACTIVE,
    )

    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    updated_by = relationship("User")

    __table_args__ = (
        UniqueConstraint("company_id", "key", name="uq_system_settings_company_key"),
        Index("ix_system_settings_company_category", "company_id", "category"),
    )