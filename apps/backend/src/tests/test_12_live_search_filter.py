import pytest


SEARCHABLE_ENDPOINTS = [
    "/api/v1/products/categories",
    "/api/v1/products/items",

    "/api/v1/hr/employees",
    "/api/v1/hr/leave-types",
    "/api/v1/hr/tasks",

    "/api/v1/crm/leads",
    "/api/v1/crm/contacts",
    "/api/v1/crm/deals",
    "/api/v1/crm/activities",

    "/api/v1/finance/accounts",
    "/api/v1/finance/tax-rates",
    "/api/v1/finance/cash-accounts",
    "/api/v1/finance/transactions",
    "/api/v1/finance/journal-entries",
    "/api/v1/finance/budgets",
]


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", SEARCHABLE_ENDPOINTS)
async def test_search_query_does_not_break_endpoint(
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
            "q": "test",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "data" in data
    assert "meta" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_product_filter_by_status(
    live_client,
    auth_headers,
):
    response = await live_client.get(
        "/api/v1/products/items",
        headers=auth_headers,
        params={
            "page": 1,
            "limit": 10,
            "status": "active",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "data" in data
    assert "meta" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_date_range_filter_does_not_break_finance_transactions(
    live_client,
    auth_headers,
):
    response = await live_client.get(
        "/api/v1/finance/transactions",
        headers=auth_headers,
        params={
            "page": 1,
            "limit": 10,
            "date_from": "2026-01-01",
            "date_to": "2026-12-31",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "data" in data
    assert "meta" in data