from __future__ import annotations

import os
from pathlib import Path

import pytest


pytestmark = pytest.mark.static


def _frontend_root() -> Path:
    configured = os.getenv("DASHAI_FRONTEND_ROOT")

    candidates = [
        Path(configured) if configured else None,
        Path("/frontend"),
        Path.cwd() / "apps" / "frontend",
        Path.cwd().parent / "frontend",
    ]

    required = [
        Path("lib/auth.ts"),
        Path("lib/api.ts"),
        Path("components/providers/auth-provider.tsx"),
        Path("features/auth/api.tsx"),
    ]

    for candidate in candidates:
        if candidate is None:
            continue

        if all(
            (candidate / relative).is_file()
            for relative in required
        ):
            return candidate

    pytest.skip(
        "Frontend source tidak di-mount ke container API."
    )


def test_refresh_token_is_not_stored_in_javascript():
    frontend = _frontend_root()

    auth_source = (
        frontend / "lib" / "auth.ts"
    ).read_text(encoding="utf-8")

    api_source = (
        frontend / "lib" / "api.ts"
    ).read_text(encoding="utf-8")

    feature_source = (
        frontend / "features" / "auth" / "api.tsx"
    ).read_text(encoding="utf-8")

    assert "getRefreshToken" not in auth_source
    assert "response.data.refresh_token" not in api_source
    assert "dashai_refresh_token" not in feature_source


def test_api_uses_httponly_cookie_refresh():
    frontend = _frontend_root()

    source = (
        frontend / "lib" / "api.ts"
    ).read_text(encoding="utf-8")

    assert "withCredentials:" in source
    assert '"/api/v1/auth/refresh"' in source
    assert "refreshPromise" in source
    assert "bootstrapAccessToken" in source


def test_auth_provider_bootstraps_and_protects_private_routes():
    frontend = _frontend_root()

    source = (
        frontend
        / "components"
        / "providers"
        / "auth-provider.tsx"
    ).read_text(encoding="utf-8")

    assert "bootstrapAccessToken" in source
    assert '["auth", "me"]' in source
    assert "router.replace" in source


def test_logout_calls_backend_before_clearing_session():
    frontend = _frontend_root()

    feature_source = (
        frontend / "features" / "auth" / "api.tsx"
    ).read_text(encoding="utf-8")

    topbar_source = (
        frontend / "components" / "layout" / "topbar.tsx"
    ).read_text(encoding="utf-8")

    assert '"/api/v1/auth/logout"' in feature_source
    assert "await logout()" in topbar_source
    assert "clearTokens" not in topbar_source
