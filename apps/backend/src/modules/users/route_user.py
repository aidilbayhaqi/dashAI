from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.users.model_user import UserRole, UserCompanyAccess
from src.modules.users.schema_user import (
    AssignPermissionToRoleCreate,
    PermissionCheckRequest,
    PermissionCheckResponse,
    UserBranchAccessCreate,
    UserBranchAccessResponse,
    UserCompanyAccessCreate,
    UserCompanyAccessResponse,
    UserCompanyAccessUpdate,
    UserCreate,
    UserPermissionCreate,
    UserPermissionResponse,
    UserPermissionUpdate,
    UserResponse,
    UserRoleCreate,
    UserRolePermissionResponse,
    UserRoleResponse,
    UserRoleUpdate,
    UserUpdate,
)
from src.modules.users.service_user import UserService
from src.security.dependencies import CurrentUser, require_permission


router = APIRouter(
    prefix="/users",
    tags=["Users & Access Control"],
)


def ensure_superuser(current_user: CurrentUser) -> None:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superuser can perform this action",
        )


def ensure_company_context(current_user: CurrentUser) -> UUID:
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no company context",
        )

    return current_user.company_id


def ensure_company_access(
    current_user: CurrentUser,
    company_id: UUID,
) -> None:
    if current_user.is_superuser:
        return

    current_company_id = ensure_company_context(current_user)

    if current_company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this company",
        )


def ensure_branch_access(
    current_user: CurrentUser,
    branch_id: UUID | None,
) -> None:
    if current_user.is_superuser:
        return

    if branch_id is None:
        return

    if not current_user.branch_ids:
        return

    if str(branch_id) not in current_user.branch_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this branch",
        )


async def get_role_or_404(
    role_id: UUID,
    db: AsyncSession,
) -> UserRole:
    result = await db.execute(
        select(UserRole).where(UserRole.id == role_id)
    )
    role = result.scalar_one_or_none()

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    return role


async def get_company_access_or_404(
    access_id: UUID,
    db: AsyncSession,
) -> UserCompanyAccess:
    result = await db.execute(
        select(UserCompanyAccess).where(UserCompanyAccess.id == access_id)
    )
    access = result.scalar_one_or_none()

    if access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company access not found",
        )

    return access


async def ensure_target_user_in_same_company(
    *,
    target_user_id: UUID,
    current_user: CurrentUser,
    service: UserService,
) -> None:
    if current_user.is_superuser:
        return

    current_company_id = ensure_company_context(current_user)

    accesses = await service.get_company_accesses(
        company_id=current_company_id,
        user_id=target_user_id,
    )

    if not accesses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this user",
        )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.users.create")),
):
    if payload.is_superuser:
        ensure_superuser(current_user)

    service = UserService(db)
    return await service.create_user(payload)


@router.get("", response_model=list[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.users.view")),
):
    service = UserService(db)

    if current_user.is_superuser:
        return await service.get_users()

    current_company_id = ensure_company_context(current_user)

    accesses = await service.get_company_accesses(company_id=current_company_id)

    users: list[UserResponse] = []

    for access in accesses:
        user = await service.get_user_by_id(access.user_id)

        if user is not None:
            users.append(user)

    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.users.view")),
):
    service = UserService(db)
    user = await service.get_user_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await ensure_target_user_in_same_company(
        target_user_id=user_id,
        current_user=current_user,
        service=service,
    )

    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.users.update")),
):
    if payload.is_superuser is not None:
        ensure_superuser(current_user)

    service = UserService(db)

    user = await service.get_user_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await ensure_target_user_in_same_company(
        target_user_id=user_id,
        current_user=current_user,
        service=service,
    )

    updated_user = await service.update_user(user_id, payload)

    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.users.delete")),
):
    ensure_superuser(current_user)

    if current_user.user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Superuser cannot delete own account",
        )

    service = UserService(db)
    deleted = await service.delete_user(user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return None


@router.post("/roles", response_model=UserRoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: UserRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.roles.create")),
):
    ensure_company_access(current_user, payload.company_id)

    if payload.is_owner_role or payload.is_system_role:
        ensure_superuser(current_user)

    service = UserService(db)
    return await service.create_role(payload)


@router.get("/roles/list", response_model=list[UserRoleResponse])
async def get_roles(
    company_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.roles.view")),
):
    ensure_company_access(current_user, company_id)

    service = UserService(db)
    return await service.get_roles(company_id)


@router.patch("/roles/{role_id}", response_model=UserRoleResponse)
async def update_role(
    role_id: UUID,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.roles.update")),
):
    role = await get_role_or_404(role_id, db)

    ensure_company_access(current_user, role.company_id)

    if role.is_system_role and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System role can only be updated by superuser",
        )

    if payload.is_owner_role is not None or payload.is_system_role is not None:
        ensure_superuser(current_user)

    service = UserService(db)
    updated_role = await service.update_role(role_id, payload)

    if updated_role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    return updated_role


@router.post(
    "/permissions",
    response_model=UserPermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_permission(
    payload: UserPermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.permissions.create")),
):
    ensure_superuser(current_user)

    service = UserService(db)
    return await service.create_permission(payload)


@router.get("/permissions/list", response_model=list[UserPermissionResponse])
async def get_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.permissions.view")),
):
    service = UserService(db)
    return await service.get_permissions()


@router.patch("/permissions/{permission_id}", response_model=UserPermissionResponse)
async def update_permission(
    permission_id: UUID,
    payload: UserPermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.permissions.update")),
):
    ensure_superuser(current_user)

    service = UserService(db)
    permission = await service.update_permission(permission_id, payload)

    if permission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    return permission


@router.post(
    "/roles/{role_id}/permissions",
    response_model=UserRolePermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def assign_permission_to_role(
    role_id: UUID,
    payload: AssignPermissionToRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.roles.manage")),
):
    role = await get_role_or_404(role_id, db)

    ensure_company_access(current_user, role.company_id)

    if role.is_system_role and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System role permissions can only be managed by superuser",
        )

    service = UserService(db)
    return await service.assign_permission_to_role(role_id, payload)


@router.post(
    "/company-accesses",
    response_model=UserCompanyAccessResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_access(
    payload: UserCompanyAccessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.access.create")),
):
    ensure_company_access(current_user, payload.company_id)
    ensure_branch_access(current_user, payload.default_branch_id)

    role = await get_role_or_404(payload.role_id, db)

    if role.company_id != payload.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role does not belong to selected company",
        )

    if payload.is_owner:
        ensure_superuser(current_user)

    service = UserService(db)
    return await service.create_company_access(payload)


@router.get(
    "/company-accesses/list",
    response_model=list[UserCompanyAccessResponse],
)
async def get_company_accesses(
    company_id: UUID | None = None,
    user_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.access.view")),
):
    if current_user.is_superuser:
        allowed_company_id = company_id
    else:
        current_company_id = ensure_company_context(current_user)

        if company_id is not None and company_id != current_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this company",
            )

        allowed_company_id = current_company_id

    service = UserService(db)
    return await service.get_company_accesses(
        company_id=allowed_company_id,
        user_id=user_id,
    )


@router.patch(
    "/company-accesses/{access_id}",
    response_model=UserCompanyAccessResponse,
)
async def update_company_access(
    access_id: UUID,
    payload: UserCompanyAccessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.access.update")),
):
    access = await get_company_access_or_404(access_id, db)

    ensure_company_access(current_user, access.company_id)
    ensure_branch_access(current_user, payload.default_branch_id)

    if payload.role_id is not None:
        role = await get_role_or_404(payload.role_id, db)

        if role.company_id != access.company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role does not belong to selected company",
            )

    if payload.is_owner is not None:
        ensure_superuser(current_user)

    service = UserService(db)
    updated_access = await service.update_company_access(access_id, payload)

    if updated_access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company access not found",
        )

    return updated_access


@router.post(
    "/branch-accesses",
    response_model=UserBranchAccessResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_branch_access(
    payload: UserBranchAccessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.access.create")),
):
    access = await get_company_access_or_404(payload.company_access_id, db)

    ensure_company_access(current_user, access.company_id)
    ensure_branch_access(current_user, payload.branch_id)

    if payload.can_manage_branch:
        ensure_superuser(current_user)

    service = UserService(db)
    return await service.create_branch_access(payload)


@router.get("/permissions/by-user", response_model=list[UserPermissionResponse])
async def get_user_permissions(
    user_id: UUID,
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.permissions.view")),
):
    ensure_company_access(current_user, company_id)

    service = UserService(db)

    await ensure_target_user_in_same_company(
        target_user_id=user_id,
        current_user=current_user,
        service=service,
    )

    return await service.get_user_permissions(
        user_id=user_id,
        company_id=company_id,
    )


@router.post("/permissions/check", response_model=PermissionCheckResponse)
async def check_permission(
    payload: PermissionCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("users.permissions.manage")),
):
    ensure_company_access(current_user, payload.company_id)
    ensure_branch_access(current_user, payload.branch_id)

    service = UserService(db)

    await ensure_target_user_in_same_company(
        target_user_id=payload.user_id,
        current_user=current_user,
        service=service,
    )

    allowed, reason = await service.user_has_permission(payload)

    return PermissionCheckResponse(
        allowed=allowed,
        reason=reason,
    )