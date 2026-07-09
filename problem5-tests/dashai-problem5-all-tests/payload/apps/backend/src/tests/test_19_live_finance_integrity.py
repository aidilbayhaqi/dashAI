from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import pytest

from src.tests.problem5_helpers import (
    delete_if_exists,
    idempotency_headers,
    paginated_rows,
)


pytestmark = [
    pytest.mark.integration,
    pytest.mark.asyncio,
]


async def test_finance_transaction_and_invoice_integrity(
    live_client,
    auth_headers: dict[str, str],
    first_company_id: str,
    first_branch_id: str | None,
):
    token = uuid4().hex
    transaction_id: str | None = None
    invoice_id: str | None = None

    transaction_no = f"TRX-IDEM-{token[:14].upper()}"
    invoice_no = f"INV-IDEM-{token[:14].upper()}"
    today = date.today()

    transaction_payload = {
        "company_id": first_company_id,
        "branch_id": first_branch_id,
        "transaction_no": transaction_no,
        "transaction_date": today.isoformat(),
        "transaction_type": "expense",
        "cashflow_activity": "operating",
        "status": "draft",
        "counterparty_name": "Problem 5 Test Vendor",
        "source_module": "problem5_test",
        "source_id": str(uuid4()),
        "subtotal_amount": "250000.00",
        "discount_amount": "0.00",
        "tax_amount": "0.00",
        "total_amount": "250000.00",
        "description": "Temporary finance integrity test",
    }

    invoice_payload = {
        "company_id": first_company_id,
        "branch_id": first_branch_id,
        "invoice_no": invoice_no,
        "client_name": "Problem 5 Test Client",
        "invoice_date": today.isoformat(),
        "due_date": (today + timedelta(days=14)).isoformat(),
        "subtotal_amount": "500000.00",
        "tax_amount": "55000.00",
        "total_amount": "555000.00",
        "paid_amount": "0.00",
        "status": "draft",
        "source_module": "problem5_test",
        "source_id": str(uuid4()),
        "notes": "Temporary invoice integrity test",
    }

    try:
        transaction_key = f"dashai-finance-transaction-{token}"
        first_transaction = await live_client.post(
            "/api/v1/finance/transactions",
            headers=idempotency_headers(
                auth_headers,
                transaction_key,
            ),
            json=transaction_payload,
        )
        assert first_transaction.status_code == 201, (
            first_transaction.text
        )
        transaction_id = first_transaction.json()["id"]
        assert (
            first_transaction.headers.get("idempotency-replayed")
            == "false"
        )

        replay_transaction = await live_client.post(
            "/api/v1/finance/transactions",
            headers=idempotency_headers(
                auth_headers,
                transaction_key,
            ),
            json=transaction_payload,
        )
        assert replay_transaction.status_code == 201, (
            replay_transaction.text
        )
        assert (
            replay_transaction.headers.get("idempotency-replayed")
            == "true"
        )
        assert replay_transaction.json()["id"] == transaction_id

        changed_transaction = await live_client.post(
            "/api/v1/finance/transactions",
            headers=idempotency_headers(
                auth_headers,
                transaction_key,
            ),
            json={
                **transaction_payload,
                "total_amount": "260000.00",
            },
        )
        assert changed_transaction.status_code == 409, (
            changed_transaction.text
        )

        duplicate_transaction = await live_client.post(
            "/api/v1/finance/transactions",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-finance-transaction-duplicate-{token}",
            ),
            json=transaction_payload,
        )
        assert duplicate_transaction.status_code == 409, (
            duplicate_transaction.text
        )

        invalid_zero_transaction = await live_client.post(
            "/api/v1/finance/transactions",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-finance-zero-{token}",
            ),
            json={
                **transaction_payload,
                "transaction_no": f"ZERO-{token[:12]}",
                "subtotal_amount": "0.00",
                "total_amount": "0.00",
            },
        )
        assert invalid_zero_transaction.status_code == 422, (
            invalid_zero_transaction.text
        )

        transaction_list = await live_client.get(
            "/api/v1/finance/transactions",
            headers=auth_headers,
            params={
                "page": 1,
                "limit": 100,
                "q": transaction_no,
                "company_id": first_company_id,
            },
        )
        assert transaction_list.status_code == 200, (
            transaction_list.text
        )
        exact_transactions = [
            row
            for row in paginated_rows(transaction_list.json())
            if row.get("transaction_no") == transaction_no
        ]
        assert len(exact_transactions) == 1

        invoice_key = f"dashai-finance-invoice-{token}"
        first_invoice = await live_client.post(
            "/api/v1/finance/invoices",
            headers=idempotency_headers(
                auth_headers,
                invoice_key,
            ),
            json=invoice_payload,
        )
        assert first_invoice.status_code == 201, first_invoice.text
        invoice_id = first_invoice.json()["id"]

        replay_invoice = await live_client.post(
            "/api/v1/finance/invoices",
            headers=idempotency_headers(
                auth_headers,
                invoice_key,
            ),
            json=invoice_payload,
        )
        assert replay_invoice.status_code == 201, replay_invoice.text
        assert (
            replay_invoice.headers.get("idempotency-replayed")
            == "true"
        )
        assert replay_invoice.json()["id"] == invoice_id

        duplicate_invoice = await live_client.post(
            "/api/v1/finance/invoices",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-finance-invoice-duplicate-{token}",
            ),
            json=invoice_payload,
        )
        assert duplicate_invoice.status_code == 409, (
            duplicate_invoice.text
        )

        invalid_due_date = await live_client.post(
            "/api/v1/finance/invoices",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-finance-invoice-date-{token}",
            ),
            json={
                **invoice_payload,
                "invoice_no": f"INV-DATE-{token[:12]}",
                "due_date": (today - timedelta(days=1)).isoformat(),
            },
        )
        assert invalid_due_date.status_code == 422, (
            invalid_due_date.text
        )

        invalid_paid_amount = await live_client.post(
            "/api/v1/finance/invoices",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-finance-invoice-paid-{token}",
            ),
            json={
                **invoice_payload,
                "invoice_no": f"INV-PAID-{token[:12]}",
                "paid_amount": "600000.00",
            },
        )
        assert invalid_paid_amount.status_code == 422, (
            invalid_paid_amount.text
        )

        invoice_list = await live_client.get(
            "/api/v1/finance/invoices",
            headers=auth_headers,
            params={
                "page": 1,
                "limit": 100,
                "q": invoice_no,
                "company_id": first_company_id,
            },
        )
        assert invoice_list.status_code == 200, invoice_list.text
        exact_invoices = [
            row
            for row in paginated_rows(invoice_list.json())
            if row.get("invoice_no") == invoice_no
        ]
        assert len(exact_invoices) == 1

    finally:
        await delete_if_exists(
            live_client,
            (
                f"/api/v1/finance/invoices/{invoice_id}"
                if invoice_id
                else None
            ),
            headers=auth_headers,
        )
        await delete_if_exists(
            live_client,
            (
                f"/api/v1/finance/transactions/{transaction_id}"
                if transaction_id
                else None
            ),
            headers=auth_headers,
        )
