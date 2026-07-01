import os
from typing import Any

import httpx
import pytest


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
TEST_EMAIL = os.getenv("TEST_EMAIL", "superadmin@dashai.test")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "admin123")


@pytest.fixture
def base_url() -> str:
    return BASE_URL


@pytest.fixture
async def live_client():
    async with httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=20.0,
    ) as client:
        yield client


async def is_server_available(client: httpx.AsyncClient) -> bool:
    try:
        response = await client.get("/health")
        return response.status_code == 200
    except Exception:
        return False


@pytest.fixture
async def require_live_server(live_client: httpx.AsyncClient):
    if not await is_server_available(live_client):
        pytest.skip(f"Live API server is not reachable at {BASE_URL}")


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

    assert "token" in data
    assert "access_token" in data["token"]
    assert "refresh_token" in data["token"]

    return data


@pytest.fixture
async def access_token(auth_data: dict[str, Any]) -> str:
    return auth_data["token"]["access_token"]


@pytest.fixture
async def refresh_token(auth_data: dict[str, Any]) -> str:
    return auth_data["token"]["refresh_token"]


@pytest.fixture
async def auth_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
    }


@pytest.fixture
async def current_user(auth_data: dict[str, Any]) -> dict[str, Any]:
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

    companies = response.json()

    if not companies:
        pytest.skip("No company data found. Run seed first: python -m src.seed")

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

    branches = response.json()

    if not branches:
        return None

    return branches[0]["id"]


async def assert_ok_response(response: httpx.Response):
    assert response.status_code in {200, 201, 204}, response.text