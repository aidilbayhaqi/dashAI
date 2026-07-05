from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.modules.admin.model_admin import SettingStatus


class ORMBase(BaseModel):
    model_config = {"from_attributes": True}


class SystemSettingCreate(BaseModel):
    company_id: UUID | None = None
    key: str
    category: str = "general"
    value: str | None = None
    status: SettingStatus = SettingStatus.ACTIVE
    updated_by_id: UUID | None = None


class SystemSettingUpdate(BaseModel):
    key: str | None = None
    category: str | None = None
    value: str | None = None
    status: SettingStatus | None = None
    updated_by_id: UUID | None = None


class SystemSettingResponse(SystemSettingCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime