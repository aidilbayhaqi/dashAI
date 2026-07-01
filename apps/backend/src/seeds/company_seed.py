from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.company.model_company import Company, CompanyBranch, CompanyStatus
from src.seeds.context import CompanySeedContext, build_context
from src.seeds.data import COMPANIES
from src.seeds.utils import add_if_missing, add_many_if_missing


async def seed_companies(db: AsyncSession) -> dict[str, CompanySeedContext]:
    contexts: dict[str, CompanySeedContext] = {}

    for spec in COMPANIES:
        branch_keys = [branch["key"] for branch in spec["branches"]]
        ctx = build_context(spec["code"], branch_keys)

        await add_if_missing(
            db,
            Company(
                id=ctx.company_id,
                name=spec["name"],
                legal_name=spec["legal_name"],
                tax_number=spec["tax_number"],
                email=spec["email"],
                phone=spec["phone"],
                website=f"https://{spec['code']}.test",
                industry=spec["industry"],
                company_size=spec["company_size"],
                address_line=f"Alamat {spec['name']}",
                city=spec["city"],
                province=spec["province"],
                country="Indonesia",
                postal_code="00000",
                default_currency="IDR",
                timezone="Asia/Jakarta",
                fiscal_year_start_month=1,
                status=CompanyStatus.ACTIVE,
                is_active=True,
            ),
        )

        branches = []

        for branch in spec["branches"]:
            branch_key = branch["key"]

            branches.append(
                CompanyBranch(
                    id=ctx.branch_ids[branch_key],
                    company_id=ctx.company_id,
                    code=branch["code"],
                    name=branch["name"],
                    branch_type=branch["branch_type"],
                    email=f"{branch_key}@{spec['code']}.branch.test",
                    phone="+62-800-0000-0000",
                    address_line=f"Alamat {branch['name']}",
                    city=branch["city"],
                    province=branch["province"],
                    country="Indonesia",
                    postal_code="00000",
                    is_head_office=branch["is_head_office"],
                    is_active=True,
                )
            )

        await add_many_if_missing(db, branches)

        contexts[ctx.code] = ctx

    await db.flush()

    return contexts