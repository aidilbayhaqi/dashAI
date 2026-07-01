import pytest


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_endpoint(live_client, require_live_server):
    response = await live_client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_root_endpoint(live_client, require_live_server):
    response = await live_client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert "message" in data
    assert "app" in data
    assert "version" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_and_me(live_client, auth_headers):
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
async def test_refresh_token(live_client, refresh_token):
    response = await live_client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_logout(live_client, auth_headers, refresh_token):
    response = await live_client.post(
        "/api/v1/auth/logout",
        headers=auth_headers,
        json={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["success"] is True