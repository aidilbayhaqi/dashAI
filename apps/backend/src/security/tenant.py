from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.company.model_company import CompanyBranch
from src.modules.users.model_user import AccessScope, UserCompanyAccess
from src.security.dependencies import CurrentUser


@dataclass(frozen=True)
class TenantParentConfig:
    """
    Dipakai oleh tabel anak yang tidak mempunyai company_id sendiri.

    Contoh:
    FinanceTransactionLine.transaction_id -> FinanceTransaction.id
    """

    field_name: str
    model_class: type


def tenant_not_found(detail: str = "Data not found") -> HTTPException:
    """
    404 dipakai untuk resource lintas tenant agar keberadaan data
    tenant lain tidak ikut terungkap.
    """

    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail,
    )


def resolve_company_id(
    *,
    current_user: CurrentUser,
    requested_company_id: UUID | None,
    required_for_superuser: bool = False,
) -> UUID | None:
    if current_user.is_superuser:
        if required_for_superuser and requested_company_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Superuser must select a company",
            )

        return requested_company_id

    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no active company context",
        )

    if (
        requested_company_id is not None
        and requested_company_id != current_user.company_id
    ):
        raise tenant_not_found()

    return current_user.company_id


def ensure_company_access(
    *,
    current_user: CurrentUser,
    company_id: UUID,
    detail: str = "Data not found",
) -> None:
    if current_user.is_superuser:
        return

    if current_user.company_id != company_id:
        raise tenant_not_found(detail)


def ensure_branch_access(
    *,
    current_user: CurrentUser,
    branch_id: UUID | None,
    detail: str = "Data not found",
) -> None:
    if branch_id is None or current_user.is_superuser:
        return

    if current_user.access_scope != AccessScope.SELECTED_BRANCHES.value:
        return

    allowed_branch_ids = current_user.allowed_branch_ids or set()

    if branch_id not in allowed_branch_ids:
        raise tenant_not_found(detail)


def resolve_branch_query_scope(
    *,
    current_user: CurrentUser,
    requested_branch_id: UUID | None,
) -> tuple[UUID | None, set[UUID] | None]:
    """
    Return:
    - effective_branch_id: filter exact dari request.
    - allowed_branch_ids: filter IN untuk selected_branches ketika
      user tidak memilih satu branch tertentu.

    None pada allowed_branch_ids berarti tidak dibatasi.
    """

    if requested_branch_id is not None:
        ensure_branch_access(
            current_user=current_user,
            branch_id=requested_branch_id,
        )

        return requested_branch_id, None

    return None, current_user.allowed_branch_ids


async def get_record_or_404(
    *,
    db: AsyncSession,
    model_class: type,
    item_id: UUID,
    detail: str = "Data not found",
):
    result = await db.execute(
        select(model_class).where(model_class.id == item_id)
    )
    item = result.scalar_one_or_none()

    if item is None:
        raise tenant_not_found(detail)

    return item


async def ensure_branch_belongs_to_company(
    *,
    db: AsyncSession,
    branch_id: UUID,
    company_id: UUID,
    current_user: CurrentUser,
) -> CompanyBranch:
    result = await db.execute(
        select(CompanyBranch).where(
            CompanyBranch.id == branch_id,
            CompanyBranch.company_id == company_id,
            CompanyBranch.is_active.is_(True),
        )
    )
    branch = result.scalar_one_or_none()

    if branch is None:
        raise tenant_not_found("Branch not found")

    ensure_branch_access(
        current_user=current_user,
        branch_id=branch.id,
        detail="Branch not found",
    )

    return branch


async def ensure_user_belongs_to_company(
    *,
    db: AsyncSession,
    user_id: UUID,
    company_id: UUID,
) -> None:
    result = await db.execute(
        select(UserCompanyAccess.id).where(
            UserCompanyAccess.user_id == user_id,
            UserCompanyAccess.company_id == company_id,
            UserCompanyAccess.is_active.is_(True),
        )
    )

    if result.scalar_one_or_none() is None:
        raise tenant_not_found("User not found in selected company")


async def get_item_tenant_context(
    *,
    db: AsyncSession,
    item: Any,
    tenant_parent: TenantParentConfig | None = None,
) -> tuple[UUID, UUID | None]:
    company_id = getattr(item, "company_id", None)
    branch_id = getattr(item, "branch_id", None)

    if company_id is not None:
        return company_id, branch_id

    if tenant_parent is None:
        raise RuntimeError(
            f"{type(item).__name__} has no company_id and no tenant_parent"
        )

    parent_id = getattr(item, tenant_parent.field_name, None)

    if parent_id is None:
        raise tenant_not_found()

    parent = await get_record_or_404(
        db=db,
        model_class=tenant_parent.model_class,
        item_id=parent_id,
    )

    parent_company_id = getattr(parent, "company_id", None)

    if parent_company_id is None:
        raise RuntimeError(
            f"Tenant parent {tenant_parent.model_class.__name__} "
            "has no company_id"
        )

    return parent_company_id, getattr(parent, "branch_id", None)


async def ensure_item_access(
    *,
    db: AsyncSession,
    item: Any,
    current_user: CurrentUser,
    tenant_parent: TenantParentConfig | None = None,
    detail: str = "Data not found",
) -> tuple[UUID, UUID | None]:
    company_id, branch_id = await get_item_tenant_context(
        db=db,
        item=item,
        tenant_parent=tenant_parent,
    )

    ensure_company_access(
        current_user=current_user,
        company_id=company_id,
        detail=detail,
    )

    ensure_branch_access(
        current_user=current_user,
        branch_id=branch_id,
        detail=detail,
    )

    return company_id, branch_id


async def resolve_create_company_id(
    *,
    db: AsyncSession,
    data: dict[str, Any],
    model_class: type,
    current_user: CurrentUser,
    tenant_parent: TenantParentConfig | None,
) -> UUID:
    if hasattr(model_class, "company_id"):
        requested_company_id = data.get("company_id")

        company_id = resolve_company_id(
            current_user=current_user,
            requested_company_id=requested_company_id,
            required_for_superuser=True,
        )

        if company_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="company_id is required",
            )

        data["company_id"] = company_id
        return company_id

    if tenant_parent is None:
        raise RuntimeError(
            f"{model_class.__name__} has no company_id and no tenant_parent"
        )

    parent_id = data.get(tenant_parent.field_name)

    if parent_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{tenant_parent.field_name} is required",
        )

    parent = await get_record_or_404(
        db=db,
        model_class=tenant_parent.model_class,
        item_id=parent_id,
    )

    company_id, _ = await ensure_item_access(
        db=db,
        item=parent,
        current_user=current_user,
    )

    return company_id


async def validate_payload_tenant_references(
    *,
    db: AsyncSession,
    data: dict[str, Any],
    company_id: UUID,
    current_user: CurrentUser,
    tenant_relations: dict[str, type] | None = None,
    user_company_fields: set[str] | None = None,
) -> None:
    branch_id = data.get("branch_id")

    if branch_id is not None:
        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=branch_id,
            company_id=company_id,
            current_user=current_user,
        )

    for field_name, related_model in (tenant_relations or {}).items():
        related_id = data.get(field_name)

        if related_id is None:
            continue

        related = await get_record_or_404(
            db=db,
            model_class=related_model,
            item_id=related_id,
            detail=f"Invalid {field_name}",
        )

        related_company_id, related_branch_id = await get_item_tenant_context(
            db=db,
            item=related,
        )

        if related_company_id != company_id:
            raise tenant_not_found(f"Invalid {field_name}")

        ensure_branch_access(
            current_user=current_user,
            branch_id=related_branch_id,
            detail=f"Invalid {field_name}",
        )

    for field_name in user_company_fields or set():
        user_id = data.get(field_name)

        if user_id is None:
            continue

        await ensure_user_belongs_to_company(
            db=db,
            user_id=user_id,
            company_id=company_id,
        )
