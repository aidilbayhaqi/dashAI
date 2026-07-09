from __future__ import annotations

import pytest

from src.main import app
from src.tests.route_utils import collect_routes


# Endpoint yang memang dirancang dapat dipanggil tanpa access token.
# Jangan memasukkan /files/upload ke sini; upload harus dilindungi.
PUBLIC_API_ROUTES = {
    ("/api/v1/auth/register/companies", "GET"),
    ("/api/v1/auth/register", "POST"),
    ("/api/v1/auth/login", "POST"),
    ("/api/v1/auth/refresh", "POST"),
    ("/api/v1/files/health", "GET"),
}

AUTH_DEPENDENCY_NAMES = {
    "get_current_user",
    "revoke_current_access_token",
    "revoke_access_token_if_present",
}


def _dependency_names(
    dependant,
    visited: set[int] | None = None,
) -> set[str]:
    if visited is None:
        visited = set()

    dependant_id = id(dependant)

    if dependant_id in visited:
        return set()

    visited.add(dependant_id)

    names: set[str] = set()

    for dependency in getattr(
        dependant,
        "dependencies",
        [],
    ):
        call = dependency.call

        names.add(
            getattr(
                call,
                "__name__",
                call.__class__.__name__,
            )
        )

        names.update(
            _dependency_names(
                dependency,
                visited,
            )
        )

    return names


@pytest.mark.static
def test_api_routes_are_protected_except_public_routes():
    unprotected: list[str] = []

    for route in collect_routes(app):
        if not route.path.startswith("/api/v1"):
            continue

        for method in route.methods:
            if method in {"HEAD", "OPTIONS"}:
                continue

            if (route.path, method) in PUBLIC_API_ROUTES:
                continue

            dependency_names = _dependency_names(
                route.dependant
            )

            has_auth_dependency = bool(
                AUTH_DEPENDENCY_NAMES
                & dependency_names
            )

            if not has_auth_dependency:
                unprotected.append(
                    f"{method} {route.path} "
                    f"deps={sorted(dependency_names)}"
                )

    assert not unprotected, (
        "Unprotected API routes found:\n"
        + "\n".join(sorted(unprotected))
    )
