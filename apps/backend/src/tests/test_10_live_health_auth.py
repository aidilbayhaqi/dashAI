import pytest

from src.core.config import settings


def _set_cookie_headers(response) -> list[str]:
    return response.headers.get_list("set-cookie")


def _has_refresh_cookie_header(response) -> bool:
    cookie_prefix = (
        f"{settings.REFRESH_COOKIE_NAME.lower()}="
    )

    return any(
        header.lower().startswith(cookie_prefix)
        for header in _set_cookie_headers(response)
    )


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_endpoint(
    live_client,
    require_live_server,
):
    response = await live_client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_root_endpoint(
    live_client,
    require_live_server,
):
    response = await live_client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert "message" in data
    assert "app" in data
    assert "version" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_and_me(
    live_client,
    auth_headers,
):
    me_response = await live_client.get(
        "/api/v1/auth/me",
        headers=auth_headers,
    )

    assert me_response.status_code == 200, me_response.text

    data = me_response.json()

    assert "id" in data
    assert "email" in data
    assert "permissions" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_refresh_token_uses_httponly_cookie(
    live_client,
    auth_data,
):
    # auth_data melakukan login dan mengisi cookie jar milik live_client.
    response = await live_client.post(
        "/api/v1/auth/refresh",
        json={},
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Refresh token tetap tersembunyi dari response JSON.
    assert "refresh_token" not in data

    # Rotation harus mengirim cookie refresh baru.
    assert _has_refresh_cookie_header(response), (
        _set_cookie_headers(response)
    )


@pytest.mark.integration
@pytest.mark.asyncio
async def test_logout_revokes_access_and_refresh_session(
    live_client,
    auth_headers,
):
    response = await live_client.post(
        "/api/v1/auth/logout",
        headers=auth_headers,
        json={},
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["success"] is True

    # Access token yang sama harus sudah masuk blacklist Redis.
    me_response = await live_client.get(
        "/api/v1/auth/me",
        headers=auth_headers,
    )

    assert me_response.status_code == 401, me_response.text

    # Refresh cookie sudah dihapus, sehingga sesi tidak bisa dipulihkan.
    refresh_response = await live_client.post(
        "/api/v1/auth/refresh",
        json={},
    )

    assert refresh_response.status_code == 401, (
        refresh_response.text
    )
