from decimal import Decimal
from types import SimpleNamespace

import pytest
from pydantic import BaseModel, Field

from src.ai.gemini_provider import GeminiProvider


class MoneyExtraction(BaseModel):
    amount: Decimal = Field(gt=0)


class FakeModels:
    def __init__(self):
        self.calls = []

    async def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(text='{"amount": 5000000}')


class FakeClient:
    def __init__(self):
        self.models = FakeModels()
        self.aio = SimpleNamespace(models=self.models)


@pytest.mark.asyncio
async def test_structured_extraction_uses_json_schema_and_pydantic_validation(monkeypatch):
    provider = GeminiProvider()
    client = FakeClient()
    monkeypatch.setattr(provider, "_client", lambda: client)

    result = await provider.extract_structured(
        prompt="nominal lima juta",
        schema=MoneyExtraction,
        system_instruction="extract",
    )

    assert result.amount == Decimal("5000000")
    assert len(client.models.calls) == 1
    config = client.models.calls[0]["config"]
    assert config["response_mime_type"] == "application/json"
    amount_schema = config["response_json_schema"]["properties"]["amount"]
    assert amount_schema["type"] == "number"


def test_settings_normalize_gemini_key_and_deprecated_model():
    from src.core.config import Settings

    runtime = Settings(
        _env_file=None,
        GEMINI_API_KEY='"GEMINI_API_KEY=test-key-value"',
        GEMINI_MODEL="models/gemini-3.1-flash-lite-preview",
    )

    assert runtime.effective_gemini_api_key == "test-key-value"
    assert runtime.gemini_key_source == "GEMINI_API_KEY"
    assert runtime.GEMINI_MODEL == "gemini-3.1-flash-lite"


def test_settings_accept_google_api_key_alias():
    from src.core.config import Settings

    runtime = Settings(
        _env_file=None,
        GEMINI_API_KEY=None,
        GOOGLE_API_KEY="google-key-value",
    )

    assert runtime.effective_gemini_api_key == "google-key-value"
    assert runtime.gemini_key_source == "GOOGLE_API_KEY"


@pytest.mark.asyncio
async def test_provider_probe_reports_success_without_exposing_key(monkeypatch):
    from src.ai import gemini_provider as module

    provider = GeminiProvider()
    client = FakeClient()
    client.models.generate_content = _probe_generate_content

    monkeypatch.setattr(module.settings, "AI_AGENT_ENABLED", True)
    monkeypatch.setattr(module.settings, "GEMINI_API_KEY", "secret-test-key")
    monkeypatch.setattr(module.settings, "GOOGLE_API_KEY", None)
    monkeypatch.setattr(module.settings, "GEMINI_MODEL", "gemini-3.1-flash-lite")
    monkeypatch.setattr(provider, "_client", lambda: client)

    result = await provider.probe()

    assert result["probe_status"] == "ok"
    assert result["configured"] is True
    assert result["key_source"] == "GEMINI_API_KEY"
    assert result["key_fingerprint"]
    assert "secret-test-key" not in str(result)


async def _probe_generate_content(**kwargs):
    return SimpleNamespace(text="OK")


def test_provider_classifies_invalid_key_and_restriction():
    from src.ai.gemini_provider import _classify_provider_error

    invalid = _classify_provider_error(
        RuntimeError("400 API_KEY_INVALID: API key not valid")
    )
    restricted = _classify_provider_error(
        RuntimeError("403 Requests from referer are blocked")
    )

    assert invalid.code == "invalid_credentials"
    assert restricted.code == "key_restricted"
