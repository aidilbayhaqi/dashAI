from __future__ import annotations

import calendar
from datetime import date, timedelta
from decimal import Decimal
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


async def test_payroll_calculation_and_finance_posting_are_idempotent(
    live_client,
    auth_headers: dict[str, str],
    first_company_id: str,
    first_branch_id: str | None,
):
    del first_branch_id

    token = uuid4().hex
    branch_id: str | None = None
    employee_id: str | None = None
    payroll_run_id: str | None = None
    finance_transaction_id: str | None = None
    attendance_ids: list[str] = []

    today = date.today()
    period_start = today.replace(day=1)
    period_end = today.replace(
        day=calendar.monthrange(today.year, today.month)[1]
    )
    payroll_no = f"PY-IDEM-{token[:14].upper()}"

    employee_payload = {
        "company_id": first_company_id,
        "branch_id": None,
        "employee_no": f"EMP-{token[:14].upper()}",
        "full_name": f"Payroll Test Employee {token[:8]}",
        "email": f"payroll-{token[:10]}@example.test",
        "department_name": "Quality Assurance",
        "job_title": "Integration Tester",
        "employment_type": "full_time",
        "status": "active",
        "hire_date": period_start.isoformat(),
        "base_salary": "1000000.00",
    }

    payroll_payload = {
        "company_id": first_company_id,
        "branch_id": None,
        "payroll_no": payroll_no,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "status": "draft",
        "total_gross": "0.00",
        "total_deductions": "0.00",
        "total_tax": "0.00",
        "total_net": "0.00",
    }

    try:
        branch_response = await live_client.post(
            f"/api/v1/companies/{first_company_id}/branches",
            headers=auth_headers,
            json={
                "code": f"PY-{token[:10].upper()}",
                "name": f"Payroll Test Branch {token[:8]}",
                "branch_type": "branch",
                "is_head_office": False,
                "is_active": True,
            },
        )
        assert branch_response.status_code == 201, branch_response.text
        branch_id = branch_response.json()["id"]
        employee_payload["branch_id"] = branch_id
        payroll_payload["branch_id"] = branch_id

        employee_response = await live_client.post(
            "/api/v1/hr/employees",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-payroll-employee-{token}",
            ),
            json=employee_payload,
        )
        assert employee_response.status_code == 201, (
            employee_response.text
        )
        employee_id = employee_response.json()["id"]

        attendance_day = period_start
        while attendance_day <= period_end:
            if attendance_day.weekday() < 5:
                attendance_response = await live_client.post(
                    "/api/v1/hr/attendance",
                    headers=idempotency_headers(
                        auth_headers,
                        f"dashai-payroll-attendance-{token}-{attendance_day.isoformat()}",
                    ),
                    json={
                        "company_id": first_company_id,
                        "branch_id": branch_id,
                        "employee_id": employee_id,
                        "attendance_date": attendance_day.isoformat(),
                        "status": "present",
                        "work_minutes": 480,
                        "overtime_minutes": 0,
                    },
                )
                assert attendance_response.status_code == 201, (
                    attendance_response.text
                )
                attendance_ids.append(attendance_response.json()["id"])
            attendance_day += timedelta(days=1)

        payroll_response = await live_client.post(
            "/api/v1/hr/payroll-runs",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-payroll-run-{token}",
            ),
            json=payroll_payload,
        )
        assert payroll_response.status_code == 201, (
            payroll_response.text
        )
        payroll_run_id = payroll_response.json()["id"]

        duplicate_number_response = await live_client.post(
            "/api/v1/hr/payroll-runs",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-payroll-duplicate-{token}",
            ),
            json=payroll_payload,
        )
        assert duplicate_number_response.status_code == 409, (
            duplicate_number_response.text
        )

        calculate_key = f"dashai-payroll-calculate-{token}"
        calculate_path = (
            f"/api/v1/hr/payroll-runs/{payroll_run_id}/calculate"
        )

        first_calculate = await live_client.post(
            calculate_path,
            headers=idempotency_headers(
                auth_headers,
                calculate_key,
            ),
        )
        assert first_calculate.status_code == 200, (
            first_calculate.text
        )
        assert (
            first_calculate.headers.get("idempotency-replayed")
            == "false"
        )

        calculated = first_calculate.json()
        assert calculated["id"] == payroll_run_id
        assert calculated["status"] == "calculated"
        assert Decimal(str(calculated["total_gross"])) >= Decimal(
            "1000000.00"
        )
        assert Decimal(str(calculated["total_net"])) > Decimal("0")

        replay_calculate = await live_client.post(
            calculate_path,
            headers=idempotency_headers(
                auth_headers,
                calculate_key,
            ),
        )
        assert replay_calculate.status_code == 200, (
            replay_calculate.text
        )
        assert (
            replay_calculate.headers.get("idempotency-replayed")
            == "true"
        )
        assert replay_calculate.json() == calculated

        other_calculate = await live_client.post(
            calculate_path,
            headers=idempotency_headers(
                auth_headers,
                f"dashai-payroll-calculate-other-{token}",
            ),
        )
        assert other_calculate.status_code == 200, (
            other_calculate.text
        )
        assert other_calculate.json()["id"] == payroll_run_id
        assert (
            Decimal(str(other_calculate.json()["total_net"]))
            == Decimal(str(calculated["total_net"]))
        )

        finance_key = f"dashai-payroll-finance-{token}"
        finance_path = (
            f"/api/v1/hr/payroll-runs/{payroll_run_id}"
            "/create-finance-transaction"
        )

        first_finance = await live_client.post(
            finance_path,
            headers=idempotency_headers(
                auth_headers,
                finance_key,
            ),
        )
        assert first_finance.status_code == 200, first_finance.text
        assert (
            first_finance.headers.get("idempotency-replayed")
            == "false"
        )

        finance_transaction_id = first_finance.json().get(
            "finance_transaction_id"
        )
        assert finance_transaction_id

        replay_finance = await live_client.post(
            finance_path,
            headers=idempotency_headers(
                auth_headers,
                finance_key,
            ),
        )
        assert replay_finance.status_code == 200, (
            replay_finance.text
        )
        assert (
            replay_finance.headers.get("idempotency-replayed")
            == "true"
        )
        assert (
            replay_finance.json()["finance_transaction_id"]
            == finance_transaction_id
        )

        other_finance = await live_client.post(
            finance_path,
            headers=idempotency_headers(
                auth_headers,
                f"dashai-payroll-finance-other-{token}",
            ),
        )
        assert other_finance.status_code == 200, (
            other_finance.text
        )
        assert (
            other_finance.json()["finance_transaction_id"]
            == finance_transaction_id
        )

        transactions_response = await live_client.get(
            "/api/v1/finance/transactions",
            headers=auth_headers,
            params={
                "page": 1,
                "limit": 100,
                "q": f"PAYROLL-{payroll_no}",
                "company_id": first_company_id,
            },
        )
        assert transactions_response.status_code == 200, (
            transactions_response.text
        )

        exact_transactions = [
            row
            for row in paginated_rows(transactions_response.json())
            if row.get("transaction_no") == f"PAYROLL-{payroll_no}"
        ]
        assert len(exact_transactions) == 1
        assert exact_transactions[0]["id"] == finance_transaction_id
        assert exact_transactions[0]["status"] == "draft"

        generic_post = await live_client.post(
            f"/api/v1/finance/transactions/{finance_transaction_id}/post",
            headers=idempotency_headers(
                auth_headers,
                f"dashai-payroll-generic-post-{token}",
            ),
            params={"company_id": first_company_id},
        )
        assert generic_post.status_code == 409, generic_post.text
        assert "Payroll Pay" in generic_post.text


    finally:
        await delete_if_exists(
            live_client,
            (
                f"/api/v1/hr/payroll-runs/{payroll_run_id}"
                if payroll_run_id
                else None
            ),
            headers=auth_headers,
        )
        await delete_if_exists(
            live_client,
            (
                f"/api/v1/finance/transactions/"
                f"{finance_transaction_id}"
                if finance_transaction_id
                else None
            ),
            headers=auth_headers,
        )
        for attendance_id in attendance_ids:
            await delete_if_exists(
                live_client,
                f"/api/v1/hr/attendance/{attendance_id}",
                headers=auth_headers,
            )
        await delete_if_exists(
            live_client,
            (
                f"/api/v1/hr/employees/{employee_id}"
                if employee_id
                else None
            ),
            headers=auth_headers,
        )
        await delete_if_exists(
            live_client,
            (
                f"/api/v1/companies/branches/{branch_id}"
                if branch_id
                else None
            ),
            headers=auth_headers,
        )
