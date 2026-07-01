import pytest

from src.main import app
from src.tests.route_utils import RouteInfo, collect_routes


CRUD_LIST_ROUTES = {
    "/api/v1/products/categories",
    "/api/v1/products/items",
    "/api/v1/products/stocks",

    "/api/v1/hr/employees",
    "/api/v1/hr/attendance",
    "/api/v1/hr/leave-types",
    "/api/v1/hr/leave-requests",
    "/api/v1/hr/tasks",
    "/api/v1/hr/payroll-runs",

    "/api/v1/crm/leads",
    "/api/v1/crm/contacts",
    "/api/v1/crm/deals",
    "/api/v1/crm/activities",

    "/api/v1/finance/accounting-periods",
    "/api/v1/finance/accounts",
    "/api/v1/finance/tax-rates",
    "/api/v1/finance/cash-accounts",
    "/api/v1/finance/transactions",
    "/api/v1/finance/transaction-lines",
    "/api/v1/finance/journal-entries",
    "/api/v1/finance/journal-lines",
    "/api/v1/finance/tax-records",
    "/api/v1/finance/budgets",
    "/api/v1/finance/budget-lines",
    "/api/v1/finance/profit-loss-snapshots",
    "/api/v1/finance/cashflow-snapshots",
    "/api/v1/finance/margin-snapshots",
    "/api/v1/finance/balance-sheet-snapshots",
}


def _find_get_route(path: str) -> RouteInfo | None:
    for route in collect_routes(app):
        if route.path == path and "GET" in route.methods:
            return route

    return None


@pytest.mark.static
def test_crud_list_routes_exist():
    missing = []

    for path in CRUD_LIST_ROUTES:
        if _find_get_route(path) is None:
            missing.append(path)

    assert not missing, "Missing CRUD list routes:\n" + "\n".join(missing)


@pytest.mark.static
def test_crud_list_routes_have_frontend_query_params():
    required_params = {
        "page",
        "limit",
        "q",
        "sort_by",
        "sort_order",
    }

    invalid_routes = []

    for path in CRUD_LIST_ROUTES:
        route = _find_get_route(path)

        if route is None:
            continue

        query_params = {
            param.name
            for param in route.dependant.query_params
        }

        missing_params = required_params - query_params

        if missing_params:
            invalid_routes.append(
                f"{path} missing params={sorted(missing_params)} current={sorted(query_params)}"
            )

    assert not invalid_routes, (
        "CRUD list routes are not frontend-ready:\n"
        + "\n".join(invalid_routes)
    )