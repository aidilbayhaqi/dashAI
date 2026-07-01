from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.company.schema_company import (
    CompanyBranchCreate,
    CompanyBranchResponse,
    CompanyBranchUpdate,
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
)
from src.modules.company.service_company import CompanyService
from src.security.dependencies import CurrentUser, require_permission


router = APIRouter(
    prefix="/companies",
    tags=["Companies"],
)


def ensure_superuser(current_user: CurrentUser) -> None:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superuser can perform this action",
        )


def ensure_company_access(
    current_user: CurrentUser,
    company_id: UUID,
) -> None:
    if current_user.is_superuser:
        return

    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no company context",
        )

    if current_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this company",
        )


def ensure_branch_access(
    current_user: CurrentUser,
    branch_id: UUID,
) -> None:
    if current_user.is_superuser:
        return

    # Kalau branch_ids kosong, diasumsikan user punya akses company/all branches.
    if not current_user.branch_ids:
        return

    if str(branch_id) not in current_user.branch_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this branch",
        )


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.profile.create")),
):
    ensure_superuser(current_user)

    service = CompanyService(db)
    return await service.create_company(payload)


@router.get("", response_model=list[CompanyResponse])
async def get_companies(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.profile.view")),
):
    service = CompanyService(db)

    if current_user.is_superuser:
        return await service.get_companies()

    if current_user.company_id is None:
        return []

    company = await service.get_company_by_id(current_user.company_id)

    return [company] if company else []


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.profile.view")),
):
    ensure_company_access(current_user, company_id)

    service = CompanyService(db)
    company = await service.get_company_by_id(company_id)

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: UUID,
    payload: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.profile.update")),
):
    ensure_company_access(current_user, company_id)

    service = CompanyService(db)
    company = await service.update_company(company_id, payload)

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.profile.delete")),
):
    ensure_superuser(current_user)

    service = CompanyService(db)
    deleted = await service.delete_company(company_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return None


@router.post(
    "/{company_id}/branches",
    response_model=CompanyBranchResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_branch(
    company_id: UUID,
    payload: CompanyBranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.branches.create")),
):
    ensure_company_access(current_user, company_id)

    service = CompanyService(db)
    company = await service.get_company_by_id(company_id)

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return await service.create_branch(company_id, payload)


@router.get("/{company_id}/branches", response_model=list[CompanyBranchResponse])
async def get_branches(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.branches.view")),
):
    ensure_company_access(current_user, company_id)

    service = CompanyService(db)
    branches = await service.get_branches(company_id)

    if current_user.is_superuser or not current_user.branch_ids:
        return branches

    allowed_branch_ids = set(current_user.branch_ids)

    return [
        branch
        for branch in branches
        if str(branch.id) in allowed_branch_ids
    ]


@router.get("/branches/{branch_id}", response_model=CompanyBranchResponse)
async def get_branch(
    branch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.branches.view")),
):
    service = CompanyService(db)
    branch = await service.get_branch_by_id(branch_id)

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    ensure_company_access(current_user, branch.company_id)
    ensure_branch_access(current_user, branch.id)

    return branch


@router.patch("/branches/{branch_id}", response_model=CompanyBranchResponse)
async def update_branch(
    branch_id: UUID,
    payload: CompanyBranchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.branches.update")),
):
    service = CompanyService(db)
    branch = await service.get_branch_by_id(branch_id)

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    ensure_company_access(current_user, branch.company_id)
    ensure_branch_access(current_user, branch.id)

    updated_branch = await service.update_branch(branch_id, payload)

    if updated_branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    return updated_branch


@router.delete("/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch(
    branch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("company.branches.delete")),
):
    service = CompanyService(db)
    branch = await service.get_branch_by_id(branch_id)

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    ensure_company_access(current_user, branch.company_id)
    ensure_branch_access(current_user, branch.id)

    deleted = await service.delete_branch(branch_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    return None