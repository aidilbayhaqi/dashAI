from __future__ import annotations

import os
from pathlib import Path

import httpx
import pytest

from src import main as main_module


pytestmark = pytest.mark.unit

COMPOSE_FILENAMES = (
    "docker-compose.yml",
    "docker-compose.production.yml",
)


def _find_project_root() -> Path:
    """Find the monorepo root without assuming a fixed parent depth."""

    configured_root = os.getenv("DASHAI_PROJECT_ROOT")
    candidates: list[Path] = []

    if configured_root:
        candidates.append(Path(configured_root).expanduser())

    current_file = Path(__file__).resolve()
    candidates.extend(current_file.parents)

    for candidate in candidates:
        if all(
            (candidate / filename).is_file()
            for filename in COMPOSE_FILENAMES
        ):
            return candidate

    pytest.skip(
        "Monorepo Compose files are not mounted in this test "
        "environment. Set DASHAI_PROJECT_ROOT or mount the "
        "repository root."
    )


async def _request_readiness(
    monkeypatch,
    *,
    database_ok: bool,
    redis_ok: bool,
) -> httpx.Response:
    async def database_check() -> bool:
        return database_ok

    async def redis_check() -> bool:
        return redis_ok

    monkeypatch.setattr(
        main_module,
        "check_database_connection",
        database_check,
    )
    monkeypatch.setattr(
        main_module,
        "check_redis_connection",
        redis_check,
    )

    app = main_module.create_app()
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.get("/ready")


@pytest.mark.asyncio
async def test_readiness_returns_200_when_dependencies_are_ready(
    monkeypatch,
):
    response = await _request_readiness(
        monkeypatch,
        database_ok=True,
        redis_ok=True,
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "database": True,
        "redis": True,
    }


@pytest.mark.asyncio
async def test_readiness_returns_503_when_database_is_unavailable(
    monkeypatch,
):
    response = await _request_readiness(
        monkeypatch,
        database_ok=False,
        redis_ok=True,
    )

    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
    assert response.json()["database"] is False


@pytest.mark.asyncio
async def test_readiness_returns_503_when_redis_is_unavailable(
    monkeypatch,
):
    response = await _request_readiness(
        monkeypatch,
        database_ok=True,
        redis_ok=False,
    )

    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
    assert response.json()["redis"] is False


@pytest.mark.static
def test_main_registers_dashboard_without_silent_import_fallback():
    source_path = Path(main_module.__file__)
    source = source_path.read_text(encoding="utf-8")

    assert (
        "from src.modules.dashboard.route_dashboard "
        "import router as dashboard_router"
    ) in source
    assert "dashboard_router = None" not in source
    assert "if dashboard_router is not None" not in source


@pytest.mark.static
def test_cors_allows_idempotency_header():
    source_path = Path(main_module.__file__)
    source = source_path.read_text(encoding="utf-8")

    assert '"Idempotency-Key"' in source


@pytest.mark.static
def test_compose_initializes_upload_ownership_before_api_start():
    project_root = _find_project_root()

    for filename in COMPOSE_FILENAMES:
        compose = (project_root / filename).read_text(
            encoding="utf-8"
        )

        assert "uploads-init:" in compose
        assert "service_completed_successfully" in compose
        assert "chown -R 10001:10001 /app/uploads" in compose
        assert "busybox:1.36.1" in compose


@pytest.mark.static
def test_compose_uses_backend_runtime_environment_names():
    project_root = _find_project_root()

    development = (
        project_root / "docker-compose.yml"
    ).read_text(encoding="utf-8")
    production = (
        project_root / "docker-compose.production.yml"
    ).read_text(encoding="utf-8")

    assert "RUN_MIGRATIONS:" in development
    assert "AUTO_MIGRATE:" not in development

    assert "REDIS_HOST: redis" in production
    assert "REDIS_PORT:" in production
    assert "REDIS_PASSWORD:" in production
    assert "REDIS_URL:" not in production
