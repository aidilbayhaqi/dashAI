from dataclasses import dataclass
from typing import Any

from fastapi.routing import APIRoute


@dataclass
class RouteInfo:
    path: str
    methods: set[str]
    dependant: Any


def collect_routes(app_or_router, parent_prefix: str = "") -> list[RouteInfo]:
    routes = getattr(app_or_router, "routes", [])

    collected: list[RouteInfo] = []

    for route in routes:
        if isinstance(route, APIRoute):
            collected.append(
                RouteInfo(
                    path=f"{parent_prefix}{route.path}",
                    methods=route.methods or set(),
                    dependant=route.dependant,
                )
            )
            continue

        nested_prefix = (
            getattr(route, "prefix", None)
            or getattr(route, "path", None)
            or ""
        )

        nested_router = getattr(route, "router", None)

        if nested_router is not None:
            collected.extend(
                collect_routes(
                    nested_router,
                    parent_prefix=f"{parent_prefix}{nested_prefix}",
                )
            )
            continue

        if hasattr(route, "routes"):
            collected.extend(
                collect_routes(
                    route,
                    parent_prefix=f"{parent_prefix}{nested_prefix}",
                )
            )

    return collected


def collect_paths(app_or_router) -> set[str]:
    return {
        route.path
        for route in collect_routes(app_or_router)
    }