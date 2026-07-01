import pytest


PROTECTED_LIST_ENDPOINTS = [
    "/api/v1/companies",
    "/api/v1/users",

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
]


CRUD_PAGINATED_ENDPOINTS = [
    endpoint
    for endpoint in PROTECTED_LIST_ENDPOINTS
    if endpoint not in {
        "/api/v1/companies",
        "/api/v1/users",
    }
]


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", PROTECTED_LIST_ENDPOINTS)
async def test_protected_list_endpoint_requires_auth(
    live_client,
    require_live_server,
    endpoint,
):
    response = await live_client.get(endpoint)

    assert response.status_code in {401, 403}, response.text


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", PROTECTED_LIST_ENDPOINTS)
async def test_protected_list_endpoint_with_auth(
    live_client,
    auth_headers,
    endpoint,
):
    response = await live_client.get(
        endpoint,
        headers=auth_headers,
        params={
            "page": 1,
            "limit": 10,
        },
    )

    assert response.status_code == 200, response.text


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", CRUD_PAGINATED_ENDPOINTS)
async def test_crud_paginated_endpoint_response_contract(
    live_client,
    auth_headers,
    endpoint,
):
    response = await live_client.get(
        endpoint,
        headers=auth_headers,
        params={
            "page": 1,
            "limit": 10,
            "q": "",
            "sort_by": "created_at",
            "sort_order": "desc",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert isinstance(data, dict), data
    assert "data" in data
    assert "meta" in data
    assert isinstance(data["data"], list)

    meta = data["meta"]

    assert "total" in meta
    assert "page" in meta
    assert "limit" in meta
    assert "total_pages" in meta
    assert "has_next" in meta
    assert "has_prev" in meta