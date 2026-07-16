from __future__ import annotations

import uuid
from dataclasses import dataclass

from src.seeds.data import FINANCE_ACCOUNTS
from src.seeds.utils import sid


@dataclass(frozen=True)
class CompanySeedContext:
    code: str
    company_id: uuid.UUID
    branch_ids: dict[str, uuid.UUID]
    role_ids: dict[str, uuid.UUID]
    user_ids: dict[str, uuid.UUID]
    account_ids: dict[str, uuid.UUID]
    period_ids: dict[int, uuid.UUID]
    cash_account_ids: dict[str, uuid.UUID]
    tax_rate_ids: dict[str, uuid.UUID]
    category_ids: dict[str, uuid.UUID]
    product_ids: dict[str, uuid.UUID]
    employee_ids: dict[str, uuid.UUID]
    leave_type_ids: dict[str, uuid.UUID]
    lead_ids: dict[str, uuid.UUID]
    contact_ids: dict[str, uuid.UUID]
    deal_ids: dict[str, uuid.UUID]


def build_context(company_code: str, branch_keys: list[str]) -> CompanySeedContext:
    return CompanySeedContext(
        code=company_code,
        company_id=sid(f"company:{company_code}"),
        branch_ids={
            key: sid(f"branch:{company_code}:{key}")
            for key in branch_keys
        },
        role_ids={
            key: sid(f"role:{company_code}:{key}")
            for key in [
                "owner",
                "admin",
                "finance_manager",
                "hr_manager",
                "sales_manager",
                "warehouse_staff",
            ]
        },
        user_ids={
            key: sid(f"user:{company_code}:{key}")
            for key in [
                "owner",
                "admin",
                "finance",
                "hr",
                "sales",
                "warehouse",
            ]
        },
        account_ids={
            str(account_spec[0]): sid(
                f"finance-account:{company_code}:{account_spec[0]}"
            )
            for account_spec in FINANCE_ACCOUNTS
        },
        period_ids={
            month: sid(f"finance-period:{company_code}:2026:{month:02d}")
            for month in range(1, 13)
        },
        cash_account_ids={
            "petty_cash": sid(f"cash-account:{company_code}:petty-cash"),
            "main_bank": sid(f"cash-account:{company_code}:main-bank"),
        },
        tax_rate_ids={
            "ppn": sid(f"tax-rate:{company_code}:ppn"),
        },
        category_ids={
            key: sid(f"product-category:{company_code}:{key}")
            for key in ["software", "service", "material", "hardware"]
        },
        product_ids={
            key: sid(f"product:{company_code}:{key}")
            for key in ["prd-001", "prd-002", "prd-003", "prd-004"]
        },
        employee_ids={
            key: sid(f"employee:{company_code}:{key}")
            for key in ["owner", "admin", "finance", "hr", "sales", "warehouse"]
        },
        leave_type_ids={
            key: sid(f"leave-type:{company_code}:{key}")
            for key in ["annual", "sick", "unpaid"]
        },
        lead_ids={
            key: sid(f"crm-lead:{company_code}:{key}")
            for key in ["lead-001", "lead-002"]
        },
        contact_ids={
            key: sid(f"crm-contact:{company_code}:{key}")
            for key in ["contact-001", "contact-002"]
        },
        deal_ids={
            key: sid(f"crm-deal:{company_code}:{key}")
            for key in ["deal-001", "deal-002"]
        },
    )