import pytest

from src.security.authentication.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
)


@pytest.mark.auth
def test_access_token_roundtrip():
    token = create_access_token(
        user_id="00000000-0000-0000-0000-000000000001",
        claims={
            "email": "test@example.com",
            "full_name": "Test User",
            "is_superuser": True,
            "company_id": None,
            "role_id": None,
            "permissions": ["finance.transactions.view"],
            "branch_ids": [],
        },
    )

    payload = decode_token(token)

    assert payload["type"] == "access"
    assert payload["sub"] == "00000000-0000-0000-0000-000000000001"
    assert payload["email"] == "test@example.com"
    assert payload["is_superuser"] is True
    assert "jti" in payload
    assert "exp" in payload


@pytest.mark.auth
def test_refresh_token_roundtrip():
    token = create_refresh_token(
        user_id="00000000-0000-0000-0000-000000000001",
        claims={
            "company_id": None,
        },
    )

    payload = decode_token(token)

    assert payload["type"] == "refresh"
    assert payload["sub"] == "00000000-0000-0000-0000-000000000001"
    assert "jti" in payload
    assert "exp" in payload