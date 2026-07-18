from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from src.ai import action_token_store


class FakeRedis:
    def __init__(self):
        self.values = set()

    async def set(self, key, value, *, ex, nx):
        assert ex > 0
        assert nx is True
        if key in self.values:
            return None
        self.values.add(key)
        return True

    async def delete(self, key):
        self.values.discard(key)
        return 1


@pytest.mark.asyncio
async def test_ai_action_token_can_only_be_claimed_once(monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(action_token_store, "redis_client", fake)
    payload = {
        "jti": "00000000-0000-0000-0000-000000000001",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }

    await action_token_store.claim_ai_action_token(payload)

    with pytest.raises(HTTPException) as exc_info:
        await action_token_store.claim_ai_action_token(payload)

    assert exc_info.value.status_code == 409
