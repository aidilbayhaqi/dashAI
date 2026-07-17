from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from src.core.config import settings


logger = logging.getLogger(__name__)
TModel = TypeVar("TModel", bound=BaseModel)


@dataclass(frozen=True)
class AIProviderFailure(Exception):
    code: str
    public_message: str
    retryable: bool = False

    def __str__(self) -> str:
        return self.public_message


def _classify_provider_error(exc: Exception) -> AIProviderFailure:
    raw = f"{type(exc).__name__}: {exc}".lower()

    if "429" in raw or "resource_exhausted" in raw or "quota" in raw:
        return AIProviderFailure(
            code="quota_exceeded",
            public_message=(
                "Kuota Gemini sedang habis. DashAI memakai analisis lokal "
                "agar demo tetap dapat berjalan."
            ),
            retryable=True,
        )

    if "401" in raw or "403" in raw or "api key" in raw or "permission_denied" in raw:
        return AIProviderFailure(
            code="invalid_credentials",
            public_message=(
                "Konfigurasi Gemini belum valid. DashAI memakai analisis lokal."
            ),
        )

    if "404" in raw or "not_found" in raw or "model" in raw and "available" in raw:
        return AIProviderFailure(
            code="model_unavailable",
            public_message=(
                "Model Gemini tidak tersedia untuk API key ini. "
                "DashAI memakai analisis lokal."
            ),
        )

    if "503" in raw or "unavailable" in raw or "overloaded" in raw:
        return AIProviderFailure(
            code="provider_unavailable",
            public_message=(
                "Gemini sedang sibuk atau tidak tersedia. "
                "DashAI memakai analisis lokal."
            ),
            retryable=True,
        )

    return AIProviderFailure(
        code="provider_error",
        public_message=(
            "Gemini belum dapat memproses permintaan. "
            "DashAI memakai analisis lokal."
        ),
    )


def _is_schema_adapter_error(exc: Exception) -> bool:
    """Identify SDK-side schema conversion errors before an HTTP request."""

    raw = f"{type(exc).__name__}: {exc}".lower()
    schema_markers = (
        "response_schema",
        "response schema",
        "response_json_schema",
        "types.schema",
        "schema.model_validate",
        "unknown field for schema",
        "generatecontentconfig",
    )
    return any(marker in raw for marker in schema_markers)


def _normalize_json_schema(value: Any) -> Any:
    """Convert Pydantic JSON Schema into a Gemini-friendly JSON Schema.

    `response_schema=<PydanticModel>` makes the Google SDK translate the model
    into `types.Schema`. Some SDK versions reject valid Pydantic schemas during
    that local conversion. Sending `response_json_schema` avoids that adapter.

    Pydantic also represents Decimal as `number | patterned string`. For Gemini
    extraction we only need JSON numbers; Pydantic converts those back to
    Decimal after the response is received.
    """

    if isinstance(value, list):
        return [_normalize_json_schema(item) for item in value]

    if not isinstance(value, dict):
        return value

    normalized = {
        key: _normalize_json_schema(item)
        for key, item in value.items()
        if key not in {"title", "default", "examples", "$schema"}
    }

    any_of = normalized.get("anyOf")
    if isinstance(any_of, list):
        number_schema = next(
            (
                item
                for item in any_of
                if isinstance(item, dict) and item.get("type") == "number"
            ),
            None,
        )
        decimal_string_schema = next(
            (
                item
                for item in any_of
                if isinstance(item, dict)
                and item.get("type") == "string"
                and "pattern" in item
            ),
            None,
        )
        null_schema = next(
            (
                item
                for item in any_of
                if isinstance(item, dict) and item.get("type") == "null"
            ),
            None,
        )

        if number_schema is not None and decimal_string_schema is not None:
            if null_schema is not None:
                normalized["anyOf"] = [number_schema, null_schema]
                return normalized
            return number_schema

    return normalized


def _build_response_json_schema(schema: type[BaseModel]) -> dict[str, Any]:
    raw_schema = schema.model_json_schema(mode="validation")
    normalized = _normalize_json_schema(raw_schema)
    if not isinstance(normalized, dict):
        raise TypeError("Structured response schema must be a JSON object")
    return normalized


def _clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```")
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    return cleaned.strip()


class GeminiProvider:
    """Small provider adapter shared by chat and AI-assisted actions.

    The rest of the ERP does not import the Google SDK directly. This keeps
    provider-specific code isolated and makes the same AI workflows reusable
    with another provider later.
    """

    @property
    def is_configured(self) -> bool:
        return bool(
            settings.AI_AGENT_ENABLED
            and settings.GEMINI_API_KEY
            and settings.GEMINI_MODEL
        )

    def _client(self) -> genai.Client:
        if not settings.GEMINI_API_KEY:
            raise AIProviderFailure(
                code="not_configured",
                public_message=(
                    "Gemini belum dikonfigurasi. DashAI memakai analisis lokal."
                ),
            )

        return genai.Client(api_key=settings.GEMINI_API_KEY)

    async def generate_with_tools(
        self,
        *,
        question: str,
        system_instruction: str,
        tools: list[Any],
    ) -> str:
        client = self._client()
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=tools,
            temperature=settings.GEMINI_AGENT_TEMPERATURE,
            max_output_tokens=settings.GEMINI_AGENT_MAX_OUTPUT_TOKENS,
        )

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=question,
                    config=config,
                ),
                timeout=settings.GEMINI_AGENT_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError as exc:
            raise AIProviderFailure(
                code="timeout",
                public_message=(
                    "Gemini melewati batas waktu. DashAI memakai analisis lokal."
                ),
                retryable=True,
            ) from exc
        except AIProviderFailure:
            raise
        except Exception as exc:
            logger.exception("Gemini content generation failed")
            raise _classify_provider_error(exc) from exc

        answer = (response.text or "").strip()
        if not answer:
            raise AIProviderFailure(
                code="empty_response",
                public_message=(
                    "Gemini menghasilkan jawaban kosong. "
                    "DashAI memakai analisis lokal."
                ),
            )

        return answer

    async def _generate_structured_response(
        self,
        *,
        client: genai.Client,
        prompt: str,
        system_instruction: str,
        response_json_schema: dict[str, Any],
    ) -> Any:
        config: dict[str, Any] = {
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
            "response_json_schema": response_json_schema,
            "temperature": 0.0,
            "max_output_tokens": min(
                settings.GEMINI_AGENT_MAX_OUTPUT_TOKENS,
                1000,
            ),
        }

        try:
            return await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=config,
                ),
                timeout=settings.GEMINI_AGENT_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError as exc:
            raise AIProviderFailure(
                code="timeout",
                public_message="Gemini melewati batas waktu ekstraksi.",
                retryable=True,
            ) from exc
        except Exception as exc:
            if not _is_schema_adapter_error(exc):
                raise

            # Compatibility fallback for SDK versions whose local config model
            # does not yet accept response_json_schema. Gemini still performs
            # the extraction in JSON mode and Pydantic validates the result.
            logger.warning(
                "Gemini SDK rejected structured schema; retrying JSON mode",
                exc_info=True,
            )
            compatibility_prompt = (
                f"{prompt}\n\n"
                "Kembalikan HANYA JSON valid tanpa markdown yang mengikuti "
                "JSON Schema berikut:\n"
                f"{json.dumps(response_json_schema, ensure_ascii=False)}"
            )
            compatibility_config: dict[str, Any] = {
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
                "temperature": 0.0,
                "max_output_tokens": min(
                    settings.GEMINI_AGENT_MAX_OUTPUT_TOKENS,
                    1000,
                ),
            }
            try:
                return await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=settings.GEMINI_MODEL,
                        contents=compatibility_prompt,
                        config=compatibility_config,
                    ),
                    timeout=settings.GEMINI_AGENT_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError as retry_exc:
                raise AIProviderFailure(
                    code="timeout",
                    public_message="Gemini melewati batas waktu ekstraksi.",
                    retryable=True,
                ) from retry_exc

    async def extract_structured(
        self,
        *,
        prompt: str,
        schema: type[TModel],
        system_instruction: str,
    ) -> TModel:
        client = self._client()
        response_json_schema = _build_response_json_schema(schema)

        try:
            response = await self._generate_structured_response(
                client=client,
                prompt=prompt,
                system_instruction=system_instruction,
                response_json_schema=response_json_schema,
            )
        except AIProviderFailure:
            raise
        except Exception as exc:
            logger.exception("Gemini structured extraction failed")
            raise _classify_provider_error(exc) from exc

        text = _clean_json_text(response.text or "")
        if not text:
            raise AIProviderFailure(
                code="empty_response",
                public_message="Gemini menghasilkan draft kosong.",
            )

        try:
            return schema.model_validate_json(text)
        except ValidationError as exc:
            logger.warning(
                "Gemini returned JSON that failed Pydantic validation",
                extra={"schema": schema.__name__},
                exc_info=True,
            )
            raise AIProviderFailure(
                code="invalid_structured_output",
                public_message=(
                    "Gemini menghasilkan format draft yang belum valid. "
                    "DashAI memakai analisis lokal."
                ),
            ) from exc


gemini_provider = GeminiProvider()
