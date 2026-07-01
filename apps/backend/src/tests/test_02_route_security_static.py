import pytest
from fastapi.routing import APIRoute

from src.main import app


PUBLIC_API_ROUTES = {
    ("/api/v1/auth/login", "POST"),
    ("/api/v1/auth/refresh", "POST"),
}


def _dependency_names(dependant) -> set[str]:
    names = set()

    for dep in dependant.dependencies:
        call = dep.call
        names.add(getattr(call, "__name__", repr(call)))
        names.update(_dependency_names(dep))

    return names


@pytest.mark.static
def test_api_routes_are_protected_except_public_auth_routes():
    unprotected = []

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue

        if not route.path.startswith("/api/v1"):
            continue

        for method in route.methods or []:
            if method in {"HEAD", "OPTIONS"}:
                continue

            if (route.path, method) in PUBLIC_API_ROUTES:
                continue

            dependency_names = _dependency_names(route.dependant)

            has_auth_dependency = bool(
                {
                    "get_current_user",
                    "dependency",
                    "revoke_current_access_token",
                }
                & dependency_names
            )

            if not has_auth_dependency:
                unprotected.append(
                    f"{method} {route.path} deps={sorted(dependency_names)}"
                )

    assert not unprotected, "Unprotected API routes found:\n" + "\n".join(unprotected)