import re
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)


RegisterAccountType = Literal[
    "company_owner",
    "company_user",
]


class LoginRequest(BaseModel):
    email: str = Field(
        ...,
        min_length=5,
        max_length=150,
    )

    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
    )

    company_id: UUID | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip().lower()

        if not normalized:
            raise ValueError(
                "Email wajib diisi."
            )

        return normalized


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

    permissions: list[str] = Field(
        default_factory=list
    )

    branch_ids: list[str] = Field(
        default_factory=list
    )


class LoginResponse(BaseModel):
    user: AuthUserResponse
    token: TokenResponse


class RegisterCompanyOption(BaseModel):
    model_config = {
        "from_attributes": True,
    }

    id: UUID
    name: str

    legal_name: str | None = None
    city: str | None = None
    province: str | None = None
    country: str | None = None


class RegisterRequest(BaseModel):
    account_type: RegisterAccountType

    # Data akun owner atau user.
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

    phone: str | None = Field(
        default=None,
        max_length=50,
    )

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    confirm_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    # Digunakan ketika mendaftar sebagai user.
    company_id: UUID | None = None

    job_title: str | None = Field(
        default=None,
        max_length=150,
    )

    department_name: str | None = Field(
        default=None,
        max_length=150,
    )

    # Digunakan ketika membuat company baru.
    company_name: str | None = Field(
        default=None,
        max_length=150,
    )

    # Field ini sebelumnya belum ada,
    # tetapi digunakan oleh service_auth.py.
    legal_name: str | None = Field(
        default=None,
        max_length=200,
    )

    company_industry: str | None = Field(
        default=None,
        max_length=100,
    )

    company_size: str | None = Field(
        default=None,
        max_length=50,
    )

    company_email: str | None = Field(
        default=None,
        max_length=150,
    )

    company_phone: str | None = Field(
        default=None,
        max_length=50,
    )

    address_line: str | None = Field(
        default=None,
        max_length=500,
    )

    city: str | None = Field(
        default=None,
        max_length=100,
    )

    province: str | None = Field(
        default=None,
        max_length=100,
    )

    country: str = Field(
        default="Indonesia",
        min_length=2,
        max_length=100,
    )

    postal_code: str | None = Field(
        default=None,
        max_length=30,
    )

    @field_validator("email")
    @classmethod
    def validate_required_email(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip().lower()

        if not normalized:
            raise ValueError(
                "Email wajib diisi."
            )

        pattern = (
            r"^[A-Za-z0-9._%+-]+"
            r"@[A-Za-z0-9.-]+"
            r"\.[A-Za-z]{2,}$"
        )

        if not re.fullmatch(
            pattern,
            normalized,
        ):
            raise ValueError(
                "Format email tidak valid."
            )

        return normalized

    @field_validator("company_email")
    @classmethod
    def validate_optional_company_email(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip().lower()

        if not normalized:
            return None

        pattern = (
            r"^[A-Za-z0-9._%+-]+"
            r"@[A-Za-z0-9.-]+"
            r"\.[A-Za-z]{2,}$"
        )

        if not re.fullmatch(
            pattern,
            normalized,
        ):
            raise ValueError(
                "Format company email tidak valid."
            )

        return normalized

    @field_validator(
        "phone",
        "job_title",
        "department_name",
        "company_name",
        "legal_name",
        "company_industry",
        "company_size",
        "company_phone",
        "address_line",
        "city",
        "province",
        "postal_code",
    )
    @classmethod
    def clean_optional_string(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()

        return normalized or None

    @field_validator(
        "full_name",
        "country",
    )
    @classmethod
    def clean_required_string(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip()

        if not normalized:
            raise ValueError(
                "Field wajib diisi."
            )

        return normalized

    @model_validator(mode="after")
    def validate_register(
        self,
    ):
        if (
            self.password
            != self.confirm_password
        ):
            raise ValueError(
                "Password dan konfirmasi password tidak sama."
            )

        if (
            self.account_type
            == "company_owner"
        ):
            company_name = (
                self.company_name or ""
            ).strip()

            if len(company_name) < 2:
                raise ValueError(
                    "Company name wajib diisi minimal 2 karakter."
                )

        if (
            self.account_type
            == "company_user"
            and self.company_id is None
        ):
            raise ValueError(
                "Company wajib dipilih."
            )

        return self