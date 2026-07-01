from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from src.modules.users.model_user import AccessScope, PermissionAction, UserStatus


class ORMBase(BaseModel):
    model_config = {
        "from_attributes": True
    }


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: str
    phone: str | None = None
    password: str | None = None
    avatar_url: str | None = None
    status: UserStatus = UserStatus.ACTIVE
    is_superuser: bool = False


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    email: str | None = None
    phone: str | None = None
    password: str | None = None
    avatar_url: str | None = None
    status: UserStatus | None = None
    is_superuser: bool | None = None


class UserResponse(ORMBase):
    id: UUID
    full_name: str
    email: str
    phone: str | None
    avatar_url: str | None
    status: UserStatus
    is_superuser: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserRoleCreate(BaseModel):
    company_id: UUID
    code: str
    name: str
    description: str | None = None
    is_owner_role: bool = False
    is_system_role: bool = False
    is_active: bool = True


class UserRoleUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    is_owner_role: bool | None = None
    is_system_role: bool | None = None
    is_active: bool | None = None


class UserRoleResponse(UserRoleCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class UserPermissionCreate(BaseModel):
    module_code: str
    feature_code: str
    action: PermissionAction
    name: str
    description: str | None = None
    is_active: bool = True


class UserPermissionUpdate(BaseModel):
    module_code: str | None = None
    feature_code: str | None = None
    action: PermissionAction | None = None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class UserPermissionResponse(UserPermissionCreate, ORMBase):
    id: UUID
    created_at: datetime


class AssignPermissionToRoleCreate(BaseModel):
    permission_id: UUID


class UserRolePermissionResponse(ORMBase):
    id: UUID
    role_id: UUID
    permission_id: UUID
    created_at: datetime


class UserCompanyAccessCreate(BaseModel):
    user_id: UUID
    company_id: UUID
    role_id: UUID
    default_branch_id: UUID | None = None
    access_scope: AccessScope = AccessScope.COMPANY
    job_title: str | None = None
    department_name: str | None = None
    is_owner: bool = False
    is_active: bool = True


class UserCompanyAccessUpdate(BaseModel):
    role_id: UUID | None = None
    default_branch_id: UUID | None = None
    access_scope: AccessScope | None = None
    job_title: str | None = None
    department_name: str | None = None
    is_owner: bool | None = None
    is_active: bool | None = None


class UserCompanyAccessResponse(UserCompanyAccessCreate, ORMBase):
    id: UUID
    invited_at: datetime | None
    joined_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserBranchAccessCreate(BaseModel):
    company_access_id: UUID
    branch_id: UUID
    can_manage_branch: bool = False
    is_default: bool = False


class UserBranchAccessResponse(UserBranchAccessCreate, ORMBase):
    id: UUID
    created_at: datetime


class PermissionCheckRequest(BaseModel):
    user_id: UUID
    company_id: UUID
    module_code: str
    feature_code: str
    action: PermissionAction
    branch_id: UUID | None = None


class PermissionCheckResponse(BaseModel):
    allowed: bool
    reason: str