from __future__ import annotations

import os
from typing import Any

import httpx
import pytest

from src.core.config import settings


BASE_URL = os.getenv(
    "TEST_BASE_URL",
    "http://localhost:8000",
)
TEST_EMAIL = os.getenv(
    "TEST_EMAIL",
    "superadmin@dashai.test",
)
TEST_PASSWORD = os.getenv(
    "TEST_PASSWORD",
    "admin123",
)


def _response_sets_cookie(
    response: httpx.Response,
    cookie_name: str,
) -> bool:
    return any(
        header.lower().startswith(
            f"{cookie_name.lower()}="
        )
        for header in response.headers.get_list("set-cookie")
    )


def _response_sets_httponly_cookie(
    response: httpx.Response,
    cookie_name: str,
) -> bool:
    return any(
        header.lower().startswith(
            f"{cookie_name.lower()}="
        )
        and "httponly" in header.lower()
        for header in response.headers.get_list("set-cookie")
    )


def _client_has_cookie(
    client: httpx.AsyncClient,
    cookie_name: str,
) -> bool:
    return any(
        cookie.name == cookie_name
        for cookie in client.cookies.jar
    )


@pytest.fixture
def base_url() -> str:
    return BASE_URL


@pytest.fixture
async def live_client():
    async with httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=20.0,
        follow_redirects=True,
    ) as client:
        yield client


async def is_server_available(
    client: httpx.AsyncClient,
) -> bool:
    try:
        response = await client.get("/health")
        return response.status_code == 200
    except httpx.HTTPError:
        return False


@pytest.fixture
async def require_live_server(
    live_client: httpx.AsyncClient,
):
    if not await is_server_available(live_client):
        pytest.skip(
            "Live API server is not reachable "
            f"at {BASE_URL}"
        )


@pytest.fixture
async def auth_data(
    live_client: httpx.AsyncClient,
    require_live_server,
) -> dict[str, Any]:
    response = await live_client.post(
        "/api/v1/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    token_data = data.get("token", {})

    assert "user" in data
    assert "access_token" in token_data
    assert token_data.get("token_type") == "bearer"

    # Refresh token tidak boleh kembali ke JSON setelah dipindahkan
    # ke HttpOnly cookie.
    assert "refresh_token" not in token_data

    cookie_name = settings.REFRESH_COOKIE_NAME

    assert _response_sets_cookie(
        response,
        cookie_name,
    ), response.headers.get_list("set-cookie")

    assert _response_sets_httponly_cookie(
        response,
        cookie_name,
    ), response.headers.get_list("set-cookie")

    assert _client_has_cookie(
        live_client,
        cookie_name,
    )

    return data


@pytest.fixture
async def access_token(
    auth_data: dict[str, Any],
) -> str:
    return auth_data["token"]["access_token"]


@pytest.fixture
async def auth_headers(
    access_token: str,
) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
    }


@pytest.fixture
async def current_user(
    auth_data: dict[str, Any],
) -> dict[str, Any]:
    return auth_data["user"]


@pytest.fixture
async def first_company_id(
    live_client: httpx.AsyncClient,
    auth_headers: dict[str, str],
) -> str:
    response = await live_client.get(
        "/api/v1/companies",
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text

    payload = response.json()

    if isinstance(payload, dict):
        companies = payload.get("data", [])
    else:
        companies = payload

    if not companies:
        pytest.skip(
            "No company data found. "
            "Run seed first: python -m src.seed"
        )

    return companies[0]["id"]


@pytest.fixture
async def first_branch_id(
    live_client: httpx.AsyncClient,
    auth_headers: dict[str, str],
    first_company_id: str,
) -> str | None:
    response = await live_client.get(
        f"/api/v1/companies/{first_company_id}/branches",
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text

    payload = response.json()

    if isinstance(payload, dict):
        branches = payload.get("data", [])
    else:
        branches = payload

    if not branches:
        return None

    return branches[0]["id"]


async def assert_ok_response(
    response: httpx.Response,
):
    assert response.status_code in {
        200,
        201,
        204,
    }, response.text
