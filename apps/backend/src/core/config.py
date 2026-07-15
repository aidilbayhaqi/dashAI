from functools import lru_cache
from typing import Literal

from pydantic import (
    field_validator,
    model_validator,
)
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # =========================================================
    # APPLICATION
    # =========================================================

    APP_NAME: str = "DashAI ERP"
    APP_VERSION: str = "1.0.0"

    ENVIRONMENT: Literal[
        "development",
        "staging",
        "production",
    ] = "development"

    DEBUG: bool = False

    LOG_LEVEL: Literal[
        "DEBUG",
        "INFO",
        "WARNING",
        "ERROR",
        "CRITICAL",
    ] = "INFO"

    # =========================================================
    # API / DOCUMENTATION
    # =========================================================

    API_PREFIX: str = "/api/v1"
    ENABLE_DOCS: bool = True

    # =========================================================
    # DATABASE
    # =========================================================

    DATABASE_URL: str = (
        "postgresql+asyncpg://"
        "dashai:dashai123"
        "@localhost:5432/dashai"
    )

    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # =========================================================
    # JWT / AUTHENTICATION
    # =========================================================

    JWT_SECRET: str = (
        "change-this-secret-key"
    )

    JWT_ALGORITHM: str = "HS256"

    JWT_ISSUER: str = "dashai-api"
    JWT_AUDIENCE: str = "dashai-web"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # =========================================================
    # BROWSER SESSION COOKIE
    # =========================================================

    REFRESH_COOKIE_NAME: str = (
        "dashai_refresh_token"
    )

    REFRESH_COOKIE_PATH: str = (
        "/api/v1/auth"
    )

    COOKIE_SECURE: bool = False

    COOKIE_SAMESITE: Literal[
        "lax",
        "strict",
        "none",
    ] = "lax"

    COOKIE_DOMAIN: str | None = None

    # =========================================================
    # REDIS
    # =========================================================

    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None
    REDIS_DB: int = 0

    # =========================================================
    # CORS
    # =========================================================

    CORS_ORIGINS: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    CORS_ALLOW_CREDENTIALS: bool = True

    # =========================================================
    # LOGIN PROTECTION
    # =========================================================

    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_BLOCK_SECONDS: int = 300

    # =========================================================
    # REALTIME
    # =========================================================

    ENABLE_REALTIME_LISTENER: bool = True
    REALTIME_RECONNECT_MIN_SECONDS: float = 1.0
    REALTIME_RECONNECT_MAX_SECONDS: float = 30.0
    REALTIME_SEND_TIMEOUT_SECONDS: float = 5.0
    REALTIME_MAX_MESSAGE_BYTES: int = 4096
    REALTIME_MAX_CONNECTIONS_PER_CHANNEL: int = 250
    REALTIME_DEDUP_TTL_SECONDS: int = 300
    REALTIME_TICKET_TTL_SECONDS: int = 60
    REALTIME_ALLOW_QUERY_ACCESS_TOKEN: bool = True

    # =========================================================
    # DASHBOARD CACHE
    # =========================================================

    DASHBOARD_CACHE_TTL_SECONDS: int = 20

    # =========================================================
    # AUTOMATION OUTBOX
    # =========================================================

    ENABLE_OUTBOX_WORKER: bool = True
    OUTBOX_POLL_INTERVAL_SECONDS: float = 1.0
    OUTBOX_BATCH_SIZE: int = 50
    OUTBOX_MAX_ATTEMPTS: int = 5

    # =========================================================
    # AI ANALYTICS (READ-ONLY)
    # =========================================================

    OPENAI_API_KEY: str | None = None
    AI_MODEL: str | None = None
    AI_ENABLE_PROVIDER: bool = False
    AI_MAX_QUESTION_LENGTH: int = 600
    AI_RATE_LIMIT_PER_MINUTE: int = 20

    # =========================================================
    # UPLOADS
    # =========================================================

    UPLOAD_DIR: str = "uploads"
    UPLOAD_URL_PREFIX: str = "/uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    # =========================================================
    # GEMINI AI AGENT
    # =========================================================

    AI_AGENT_ENABLED: bool = False
    AI_PROVIDER: str = "gemini"

    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"

    GEMINI_AGENT_TIMEOUT_SECONDS: float = 30.0
    GEMINI_AGENT_MAX_OUTPUT_TOKENS: int = 1200
    GEMINI_AGENT_TEMPERATURE: float = 0.1

    # =========================================================
    # FIELD VALIDATORS
    # =========================================================

    @field_validator(
        "REDIS_PASSWORD",
        "COOKIE_DOMAIN",
        "OPENAI_API_KEY",
        "AI_MODEL",
        "GEMINI_API_KEY",
        mode="before",
    )
    @classmethod
    def empty_optional_string_to_none(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = str(value).strip()

        return normalized or None
    
    @field_validator("GEMINI_AGENT_TIMEOUT_SECONDS")
    @classmethod
    def validate_gemini_timeout(
        cls,
        value: float,
    ) -> float:
        if value <= 0:
            raise ValueError(
                "GEMINI_AGENT_TIMEOUT_SECONDS must be positive"
            )

        return value


    @field_validator("GEMINI_AGENT_MAX_OUTPUT_TOKENS")
    @classmethod
    def validate_gemini_output_tokens(
        cls,
        value: int,
    ) -> int:
        if value <= 0:
            raise ValueError(
                "GEMINI_AGENT_MAX_OUTPUT_TOKENS must be positive"
            )

        return value


    @field_validator("GEMINI_AGENT_TEMPERATURE")
    @classmethod
    def validate_gemini_temperature(
        cls,
        value: float,
    ) -> float:
        if value < 0 or value > 2:
            raise ValueError(
                "GEMINI_AGENT_TEMPERATURE must be between 0 and 2"
            )

        return value


    @field_validator(
        "REALTIME_RECONNECT_MIN_SECONDS",
        "REALTIME_RECONNECT_MAX_SECONDS",
        "REALTIME_SEND_TIMEOUT_SECONDS",
        "OUTBOX_POLL_INTERVAL_SECONDS",
    )
    @classmethod
    def validate_positive_seconds(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Realtime timeout/reconnect values must be positive")
        return value

    @field_validator(
        "REALTIME_MAX_MESSAGE_BYTES",
        "REALTIME_MAX_CONNECTIONS_PER_CHANNEL",
        "REALTIME_DEDUP_TTL_SECONDS",
        "REALTIME_TICKET_TTL_SECONDS",
        "DASHBOARD_CACHE_TTL_SECONDS",
        "OUTBOX_BATCH_SIZE",
        "OUTBOX_MAX_ATTEMPTS",
        "AI_MAX_QUESTION_LENGTH",
        "AI_RATE_LIMIT_PER_MINUTE",
    )
    @classmethod
    def validate_positive_limits(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Realtime and AI limits must be positive")
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(
        cls,
        value: str,
    ) -> str:
        if not value:
            raise ValueError(
                "DATABASE_URL tidak boleh kosong"
            )

        return value

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(
        cls,
        value: str,
    ) -> str:
        if not value:
            raise ValueError(
                "JWT_SECRET tidak boleh kosong"
            )

        return value

    @field_validator(
        "REFRESH_COOKIE_PATH"
    )
    @classmethod
    def validate_cookie_path(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip()

        if not normalized.startswith("/"):
            raise ValueError(
                "REFRESH_COOKIE_PATH harus "
                "diawali dengan '/'"
            )

        return (
            normalized.rstrip("/")
            or "/"
        )

    # =========================================================
    # SECURITY VALIDATION
    # =========================================================

    @model_validator(mode="after")
    def validate_security_config(
        self,
    ) -> "Settings":
        if (
            self.COOKIE_SAMESITE == "none"
            and not self.COOKIE_SECURE
        ):
            raise ValueError(
                "COOKIE_SAMESITE='none' "
                "membutuhkan COOKIE_SECURE=true"
            )

        if (
            self.CORS_ALLOW_CREDENTIALS
            and "*"
            in self.cors_origins_list
        ):
            raise ValueError(
                "CORS_ORIGINS='*' tidak boleh "
                "dipakai bersama credential"
            )

        if (
            self.ENVIRONMENT
            != "production"
        ):
            return self

        if self.REALTIME_ALLOW_QUERY_ACCESS_TOKEN:
            raise ValueError(
                "REALTIME_ALLOW_QUERY_ACCESS_TOKEN harus false di production; "
                "gunakan one-time realtime ticket"
            )

        if self.DEBUG:
            raise ValueError(
                "DEBUG harus false "
                "di production"
            )

        if self.DB_ECHO:
            raise ValueError(
                "DB_ECHO harus false "
                "di production"
            )

        if self.JWT_SECRET in {
            "supersecret",
            "change-this-secret-key",
        }:
            raise ValueError(
                "JWT_SECRET default tidak "
                "boleh dipakai di production"
            )

        if len(self.JWT_SECRET) < 32:
            raise ValueError(
                "JWT_SECRET minimal 32 karakter "
                "di production"
            )

        if (
            "dashai:dashai123"
            in self.DATABASE_URL
        ):
            raise ValueError(
                "DATABASE_URL default tidak "
                "boleh dipakai di production"
            )

        if not self.COOKIE_SECURE:
            raise ValueError(
                "COOKIE_SECURE harus true "
                "di production"
            )
        
        if self.AI_AGENT_ENABLED:
            if self.AI_PROVIDER != "gemini":
                raise ValueError(
                    "AI_PROVIDER must be gemini when using Gemini Agent"
                )

            if not self.GEMINI_API_KEY:
                raise ValueError(
                    "GEMINI_API_KEY is required "
                    "when AI_AGENT_ENABLED=true"
                )

            if not self.GEMINI_MODEL:
                raise ValueError(
                    "GEMINI_MODEL is required "
                    "when AI_AGENT_ENABLED=true"
                )

        return self

    # =========================================================
    # PROPERTIES
    # =========================================================

    @property
    def is_production(self) -> bool:
        return (
            self.ENVIRONMENT
            == "production"
        )

    @property
    def cors_origins_list(
        self,
    ) -> list[str]:
        return [
            origin
            .strip()
            .rstrip("/")
            for origin
            in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def docs_url(
        self,
    ) -> str | None:
        return (
            "/docs"
            if self.ENABLE_DOCS
            else None
        )

    @property
    def redoc_url(
        self,
    ) -> str | None:
        return (
            "/redoc"
            if self.ENABLE_DOCS
            else None
        )

    @property
    def openapi_url(
        self,
    ) -> str | None:
        return (
            "/openapi.json"
            if self.ENABLE_DOCS
            else None
        )

    @property
    def sync_database_url(
        self,
    ) -> str:
        return self.DATABASE_URL.replace(
            "postgresql+asyncpg",
            "postgresql+psycopg2",
        )

    @property
    def SYNC_DATABASE_URL(
        self,
    ) -> str:
        return self.sync_database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()