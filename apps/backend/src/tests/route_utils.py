from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi.routing import APIRoute


@dataclass(frozen=True)
class RouteInfo:
    path: str
    methods: set[str]
    dependant: Any


def _normalize_path(value: str | None) -> str:
    if not value:
        return ""

    normalized = str(value).strip()

    if not normalized:
        return ""

    if not normalized.startswith("/"):
        normalized = f"/{normalized}"

    if normalized != "/":
        normalized = normalized.rstrip("/")

    return normalized


def _join_paths(prefix: str | None, path: str | None) -> str:
    normalized_prefix = _normalize_path(prefix)
    normalized_path = _normalize_path(path)

    if not normalized_prefix:
        return normalized_path or "/"

    if not normalized_path or normalized_path == "/":
        return normalized_prefix

    # Beberapa versi FastAPI sudah menempelkan prefix ke route.path.
    # Hindari hasil seperti /api/v1/api/v1/auth/login.
    if (
        normalized_path == normalized_prefix
        or normalized_path.startswith(f"{normalized_prefix}/")
    ):
        return normalized_path

    return (
        f"{normalized_prefix.rstrip('/')}"
        f"/{normalized_path.lstrip('/')}"
    )


def _get_include_prefix(route: Any) -> str:
    include_context = getattr(route, "include_context", None)

    if isinstance(include_context, dict):
        context_prefix = include_context.get("prefix")
    else:
        context_prefix = getattr(include_context, "prefix", None)

    return (
        context_prefix
        or getattr(route, "prefix", None)
        or ""
    )


def collect_routes(
    app_or_router: Any,
    parent_prefix: str = "",
    _visited: set[tuple[int, str]] | None = None,
) -> list[RouteInfo]:
    """
    Mengambil semua APIRoute, termasuk router yang dibungkus oleh
    FastAPI versi baru menggunakan internal `_IncludedRouter`.

    Collector memakai duck-typing agar tidak bergantung pada import
    class internal FastAPI yang dapat berubah antarversi.
    """

    if _visited is None:
        _visited = set()

    visit_key = (
        id(app_or_router),
        _normalize_path(parent_prefix),
    )

    if visit_key in _visited:
        return []

    _visited.add(visit_key)

    routes = getattr(app_or_router, "routes", None)

    if routes is None:
        router = getattr(app_or_router, "router", None)
        routes = getattr(router, "routes", [])

    collected: list[RouteInfo] = []

    for route in routes or []:
        if isinstance(route, APIRoute):
            collected.append(
                RouteInfo(
                    path=_join_paths(
                        parent_prefix,
                        route.path,
                    ),
                    methods={
                        method.upper()
                        for method in (route.methods or set())
                    },
                    dependant=route.dependant,
                )
            )
            continue

        # FastAPI versi baru dapat menyimpan include_router sebagai
        # `_IncludedRouter(original_router=..., include_context=...)`.
        original_router = getattr(route, "original_router", None)

        if original_router is not None:
            include_prefix = _get_include_prefix(route)

            collected.extend(
                collect_routes(
                    original_router,
                    parent_prefix=_join_paths(
                        parent_prefix,
                        include_prefix,
                    ),
                    _visited=_visited,
                )
            )
            continue

        nested_router = getattr(route, "router", None)

        if nested_router is not None:
            nested_prefix = (
                getattr(route, "prefix", None)
                or getattr(route, "path", None)
                or ""
            )

            collected.extend(
                collect_routes(
                    nested_router,
                    parent_prefix=_join_paths(
                        parent_prefix,
                        nested_prefix,
                    ),
                    _visited=_visited,
                )
            )
            continue

        if hasattr(route, "routes"):
            nested_prefix = (
                getattr(route, "prefix", None)
                or getattr(route, "path", None)
                or ""
            )

            collected.extend(
                collect_routes(
                    route,
                    parent_prefix=_join_paths(
                        parent_prefix,
                        nested_prefix,
                    ),
                    _visited=_visited,
                )
            )

    # Hilangkan duplikasi yang dapat muncul ketika framework mengekspos
    # router melalui lebih dari satu wrapper internal.
    unique: dict[tuple[str, tuple[str, ...]], RouteInfo] = {}

    for route_info in collected:
        key = (
            route_info.path,
            tuple(sorted(route_info.methods)),
        )
        unique[key] = route_info

    return list(unique.values())


def collect_paths(app_or_router: Any) -> set[str]:
    """
    Untuk FastAPI app, OpenAPI adalah sumber kontrak path yang lebih
    stabil daripada struktur internal app.routes.
    """

    openapi_factory = getattr(app_or_router, "openapi", None)

    if callable(openapi_factory):
        schema = openapi_factory()
        paths = schema.get("paths", {})

        if isinstance(paths, dict):
            return set(paths.keys())

    return {
        route.path
        for route in collect_routes(app_or_router)
    }
