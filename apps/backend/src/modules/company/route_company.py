from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.company.schema_company import (
    CompanyBranchCreate,
    CompanyBranchResponse,
    CompanyBranchUpdate,
    CompanyCreate,
    CompanyDetailResponse,
    CompanyProvisionCreate,
    CompanyResponse,
    CompanyUpdate,
)
from src.modules.company.service_company import CompanyService
from src.security.dependencies import CurrentUser, require_permission


router = APIRouter(
    prefix="/companies",
    tags=["Companies"],
)


# =========================================================
# ACCESS HELPERS
# =========================================================


def ensure_superuser(current_user: CurrentUser) -> None:
    """
    Hanya superadmin yang boleh menjalankan fitur tertentu.
    """

    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superuser can perform this action",
        )


def ensure_company_access(
    current_user: CurrentUser,
    company_id: UUID,
) -> None:
    """
    Superadmin boleh mengakses seluruh company.

    User biasa hanya boleh mengakses company yang sesuai
    dengan company context miliknya.
    """

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
    """
    Superadmin boleh mengakses seluruh branch.

    Jika branch_ids kosong, user dianggap memiliki akses
    ke semua branch dalam company miliknya.
    """

    if current_user.is_superuser:
        return

    if not current_user.branch_ids:
        return

    allowed_branch_ids = {
        str(value)
        for value in current_user.branch_ids
    }

    if str(branch_id) not in allowed_branch_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this branch",
        )


# =========================================================
# SUPERADMIN COMPANY PROVISIONING
# =========================================================


@router.post(
    "/provision",
    response_model=CompanyDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def provision_company(
    payload: CompanyProvisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.profile.create")
    ),
):
    """
    Membuat sekaligus:

    - company;
    - head office;
    - akun owner;
    - role owner;
    - beberapa akun admin/staff;
    - akses company;
    - akses branch.

    Endpoint ini hanya dapat digunakan oleh superadmin.
    """

    ensure_superuser(current_user)

    service = CompanyService(db)

    try:
        company_detail = await service.provision_company(payload)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to provision company",
        ) from exc

    if company_detail is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Company berhasil diproses, tetapi detail company "
                "gagal dibaca."
            ),
        )

    return company_detail


# =========================================================
# COMPANY LIST
# =========================================================


@router.get(
    "",
    response_model=list[CompanyResponse],
)
async def get_companies(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.profile.view")
    ),
):
    """
    Superadmin mendapatkan semua company.

    User biasa hanya mendapatkan company miliknya.

    Response ini dapat langsung ditampilkan frontend
    menggunakan model card.
    """

    service = CompanyService(db)

    if current_user.is_superuser:
        return await service.get_companies()

    if current_user.company_id is None:
        return []

    company = await service.get_company_by_id(
        current_user.company_id
    )

    return [company] if company else []


# =========================================================
# STANDARD COMPANY CREATE
# =========================================================


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_company(
    payload: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.profile.create")
    ),
):
    """
    Membuat company standar tanpa owner dan user.

    Untuk membuat company sekaligus owner dan user,
    gunakan POST /companies/provision.
    """

    ensure_superuser(current_user)

    service = CompanyService(db)

    try:
        return await service.create_company(payload)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


# =========================================================
# COMPANY DETAIL WITH USERS
# =========================================================


@router.get(
    "/{company_id}/detail",
    response_model=CompanyDetailResponse,
)
async def get_company_detail(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.profile.view")
    ),
):
    """
    Mengambil detail lengkap company:

    - profil company;
    - daftar branch;
    - akun owner;
    - seluruh user;
    - role masing-masing user.
    """

    ensure_company_access(
        current_user,
        company_id,
    )

    service = CompanyService(db)

    company_detail = await service.get_company_detail(
        company_id
    )

    if company_detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company_detail


# =========================================================
# COMPANY PROFILE CRUD
# =========================================================


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
)
async def get_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.profile.view")
    ),
):
    ensure_company_access(
        current_user,
        company_id,
    )

    service = CompanyService(db)

    company = await service.get_company_by_id(
        company_id
    )

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
)
async def update_company(
    company_id: UUID,
    payload: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.profile.update")
    ),
):
    ensure_company_access(
        current_user,
        company_id,
    )

    service = CompanyService(db)

    try:
        company = await service.update_company(
            company_id,
            payload,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.profile.delete")
    ),
):
    ensure_superuser(current_user)

    service = CompanyService(db)

    deleted = await service.delete_company(
        company_id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return None


# =========================================================
# COMPANY BRANCHES
# =========================================================


@router.post(
    "/{company_id}/branches",
    response_model=CompanyBranchResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_branch(
    company_id: UUID,
    payload: CompanyBranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.branches.create")
    ),
):
    ensure_company_access(
        current_user,
        company_id,
    )

    service = CompanyService(db)

    company = await service.get_company_by_id(
        company_id
    )

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    try:
        return await service.create_branch(
            company_id,
            payload,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "/{company_id}/branches",
    response_model=list[CompanyBranchResponse],
)
async def get_branches(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.branches.view")
    ),
):
    ensure_company_access(
        current_user,
        company_id,
    )

    service = CompanyService(db)

    branches = await service.get_branches(
        company_id
    )

    if current_user.is_superuser:
        return branches

    if not current_user.branch_ids:
        return branches

    allowed_branch_ids = {
        str(value)
        for value in current_user.branch_ids
    }

    return [
        branch
        for branch in branches
        if str(branch.id) in allowed_branch_ids
    ]


# =========================================================
# BRANCH DETAIL CRUD
# =========================================================


@router.get(
    "/branches/{branch_id}",
    response_model=CompanyBranchResponse,
)
async def get_branch(
    branch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.branches.view")
    ),
):
    service = CompanyService(db)

    branch = await service.get_branch_by_id(
        branch_id
    )

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    ensure_company_access(
        current_user,
        branch.company_id,
    )

    ensure_branch_access(
        current_user,
        branch.id,
    )

    return branch


@router.patch(
    "/branches/{branch_id}",
    response_model=CompanyBranchResponse,
)
async def update_branch(
    branch_id: UUID,
    payload: CompanyBranchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.branches.update")
    ),
):
    service = CompanyService(db)

    branch = await service.get_branch_by_id(
        branch_id
    )

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    ensure_company_access(
        current_user,
        branch.company_id,
    )

    ensure_branch_access(
        current_user,
        branch.id,
    )

    try:
        updated_branch = await service.update_branch(
            branch_id,
            payload,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if updated_branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    return updated_branch


@router.delete(
    "/branches/{branch_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_branch(
    branch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("company.branches.delete")
    ),
):
    service = CompanyService(db)

    branch = await service.get_branch_by_id(
        branch_id
    )

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    ensure_company_access(
        current_user,
        branch.company_id,
    )

    ensure_branch_access(
        current_user,
        branch.id,
    )

    deleted = await service.delete_branch(
        branch_id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    return None