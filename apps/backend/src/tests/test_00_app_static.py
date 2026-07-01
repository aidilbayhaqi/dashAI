import pytest

from src.main import app
from src.tests.route_utils import collect_paths


@pytest.mark.static
def test_app_can_be_imported():
    assert app is not None
    assert app.title


@pytest.mark.static
def test_core_routes_exist():
    paths = collect_paths(app)

    assert "/" in paths
    assert "/health" in paths
    assert "/health/db" in paths
    assert "/health/redis" in paths
    assert "/ready" in paths


@pytest.mark.static
def test_auth_routes_exist():
    paths = collect_paths(app)

    assert "/api/v1/auth/login" in paths
    assert "/api/v1/auth/refresh" in paths
    assert "/api/v1/auth/logout" in paths
    assert "/api/v1/auth/me" in paths


@pytest.mark.static
def test_main_module_routes_are_registered():
    paths = collect_paths(app)

    expected_prefixes = [
        "/api/v1/companies",
        "/api/v1/users",
        "/api/v1/products",
        "/api/v1/hr",
        "/api/v1/crm",
        "/api/v1/finance",
    ]

    missing = []

    for prefix in expected_prefixes:
        if not any(path.startswith(prefix) for path in paths):
            missing.append(prefix)

    assert not missing, f"Missing route prefixes: {missing}"