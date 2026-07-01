from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.company.model_company import Company, CompanyBranch
from src.modules.company.schema_company import (
    CompanyBranchCreate,
    CompanyBranchUpdate,
    CompanyCreate,
    CompanyUpdate,
)


class CompanyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_company(self, payload: CompanyCreate):
        company = Company(**payload.model_dump())

        self.db.add(company)
        await self.db.commit()
        await self.db.refresh(company)

        return company

    async def get_companies(self):
        result = await self.db.execute(
            select(Company).order_by(Company.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_company_by_id(self, company_id: UUID):
        result = await self.db.execute(
            select(Company).where(Company.id == company_id)
        )
        return result.scalar_one_or_none()

    async def get_company_detail(self, company_id: UUID):
        result = await self.db.execute(
            select(Company)
            .where(Company.id == company_id)
            .options(
                selectinload(Company.branches),
                selectinload(Company.user_accesses),
            )
        )
        return result.scalar_one_or_none()

    async def update_company(self, company_id: UUID, payload: CompanyUpdate):
        company = await self.get_company_by_id(company_id)

        if company is None:
            return None

        data = payload.model_dump(exclude_unset=True)

        for field, value in data.items():
            setattr(company, field, value)

        await self.db.commit()
        await self.db.refresh(company)

        return company

    async def delete_company(self, company_id: UUID) -> bool:
        company = await self.get_company_by_id(company_id)

        if company is None:
            return False

        await self.db.delete(company)
        await self.db.commit()

        return True

    async def create_branch(self, company_id: UUID, payload: CompanyBranchCreate):
        branch = CompanyBranch(
            company_id=company_id,
            **payload.model_dump(),
        )

        self.db.add(branch)
        await self.db.commit()
        await self.db.refresh(branch)

        return branch

    async def get_branches(self, company_id: UUID):
        result = await self.db.execute(
            select(CompanyBranch)
            .where(CompanyBranch.company_id == company_id)
            .order_by(CompanyBranch.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_branch_by_id(self, branch_id: UUID):
        result = await self.db.execute(
            select(CompanyBranch).where(CompanyBranch.id == branch_id)
        )
        return result.scalar_one_or_none()

    async def update_branch(self, branch_id: UUID, payload: CompanyBranchUpdate):
        branch = await self.get_branch_by_id(branch_id)

        if branch is None:
            return None

        data = payload.model_dump(exclude_unset=True)

        for field, value in data.items():
            setattr(branch, field, value)

        await self.db.commit()
        await self.db.refresh(branch)

        return branch

    async def delete_branch(self, branch_id: UUID) -> bool:
        branch = await self.get_branch_by_id(branch_id)

        if branch is None:
            return False

        await self.db.delete(branch)
        await self.db.commit()

        return True