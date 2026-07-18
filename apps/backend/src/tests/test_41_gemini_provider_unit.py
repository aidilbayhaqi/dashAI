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
