from uuid import UUID

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    company_id: UUID | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthUserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    is_superuser: bool
    company_id: UUID | None = None
    role_id: UUID | None = None
    permissions: list[str] = []
    branch_ids: list[str] = []


class LoginResponse(BaseModel):
    user: AuthUserResponse
    token: TokenResponse