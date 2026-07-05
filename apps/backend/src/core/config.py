from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # Application
    APP_NAME: str = "DashAI ERP"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # API / Docs
    API_PREFIX: str = "/api/v1"
    ENABLE_DOCS: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dashai:dashai123@localhost:5432/dashai"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # JWT / Auth
    JWT_SECRET: str = "change-this-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None
    REDIS_DB: int = 0

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ALLOW_CREDENTIALS: bool = True

    # Login protection
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_BLOCK_SECONDS: int = 300

    # Realtime
    ENABLE_REALTIME_LISTENER: bool = True

     # Uploads
    UPLOAD_DIR: str = "uploads"
    UPLOAD_URL_PREFIX: str = "/uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    @field_validator("REDIS_PASSWORD", mode="before")
    @classmethod
    def empty_redis_password_to_none(cls, value: str | None) -> str | None:
        if value == "":
            return None
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value:
            raise ValueError("DATABASE_URL tidak boleh kosong")
        return value

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if not value:
            raise ValueError("JWT_SECRET tidak boleh kosong")
        return value

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        if self.ENVIRONMENT != "production":
            return self

        if self.DEBUG:
            raise ValueError("DEBUG harus false di production")

        if self.DB_ECHO:
            raise ValueError("DB_ECHO harus false di production")

        if self.JWT_SECRET in {"supersecret", "change-this-secret-key"}:
            raise ValueError("JWT_SECRET default tidak boleh dipakai di production")

        if len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET minimal 32 karakter di production")

        if "dashai:dashai123" in self.DATABASE_URL:
            raise ValueError("DATABASE_URL default tidak boleh dipakai di production")

        if "*" in self.cors_origins_list and self.CORS_ALLOW_CREDENTIALS:
            raise ValueError("CORS_ORIGINS='*' tidak boleh dipakai bersama credential di production")

        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def docs_url(self) -> str | None:
        return "/docs" if self.ENABLE_DOCS else None

    @property
    def redoc_url(self) -> str | None:
        return "/redoc" if self.ENABLE_DOCS else None

    @property
    def openapi_url(self) -> str | None:
        return "/openapi.json" if self.ENABLE_DOCS else None

    @property
    def sync_database_url(self) -> str:
        return self.DATABASE_URL.replace(
            "postgresql+asyncpg",
            "postgresql+psycopg2",
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return self.sync_database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()