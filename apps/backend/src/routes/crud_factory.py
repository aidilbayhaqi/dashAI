from datetime import date, datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.schemas.pagination import PaginatedResponse
from src.security.dependencies import CurrentUser, require_permission
from src.service.crud_service import CRUDService


def _permission_dependency(permission_prefix: str | None, action: str):
    if not permission_prefix:
        return None

    return require_permission(f"{permission_prefix}.{action}")


def _resolve_company_id(
    *,
    requested_company_id: UUID | None,
    current_user: CurrentUser | None,
    model_class: type,
):
    if not hasattr(model_class, "company_id"):
        return None

    if current_user is None:
        return requested_company_id

    if current_user.is_superuser:
        return requested_company_id

    return current_user.company_id


def _validate_company_access(
    *,
    item,
    current_user: CurrentUser | None,
):
    if current_user is None:
        return

    if current_user.is_superuser:
        return

    if not hasattr(item, "company_id"):
        return

    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to any company",
        )

    if item.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this company resource",
        )


def _prepare_create_payload(
    *,
    payload,
    current_user: CurrentUser | None,
    model_class: type,
):
    data = payload.model_dump()

    if not hasattr(model_class, "company_id"):
        return data

    if current_user is None:
        return data

    if current_user.is_superuser:
        return data

    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to any company",
        )

    data["company_id"] = current_user.company_id

    return data


def _build_query_filters(
    *,
    model_class: type,
    branch_id: UUID | None = None,
    category_id: UUID | None = None,
    product_id: UUID | None = None,
    employee_id: UUID | None = None,
    period_id: UUID | None = None,
    status_value: str | None = None,
    is_active: bool | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    date_filter_field: str = "created_at",
):
    filters = {}

    simple_filters = {
        "branch_id": branch_id,
        "category_id": category_id,
        "product_id": product_id,
        "employee_id": employee_id,
        "period_id": period_id,
        "status": status_value,
        "is_active": is_active,
    }

    for field, value in simple_filters.items():
        if value is None:
            continue

        if hasattr(model_class, field):
            filters[field] = value

    if hasattr(model_class, date_filter_field):
        date_range = {}

        if date_from:
            date_range["gte"] = datetime.combine(date_from, time.min)

        if date_to:
            date_range["lte"] = datetime.combine(date_to, time.max)

        if date_range:
            filters[date_filter_field] = date_range

    return filters


def create_crud_router(
    *,
    prefix: str,
    tags: list[str],
    model_class: type,
    create_schema: type,
    update_schema: type,
    response_schema: type,
    permission_prefix: str | None = None,
    search_fields: list[str] | None = None,
    date_filter_field: str = "created_at",
):
    router = APIRouter(
        prefix=prefix,
        tags=tags,
    )

    create_permission = _permission_dependency(permission_prefix, "create")
    view_permission = _permission_dependency(permission_prefix, "view")
    update_permission = _permission_dependency(permission_prefix, "update")
    delete_permission = _permission_dependency(permission_prefix, "delete")

    @router.post(
        "",
        response_model=response_schema,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_item(
        payload: create_schema,
        db: AsyncSession = Depends(get_db),
        current_user: CurrentUser | None = Depends(create_permission)
        if create_permission
        else None,
    ):
        service = CRUDService(db, model_class)

        data = _prepare_create_payload(
            payload=payload,
            current_user=current_user,
            model_class=model_class,
        )

        return await service.create(data)

    @router.get(
        "",
        response_model=PaginatedResponse[response_schema],
    )
    async def get_items(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, ge=1, le=100),
        q: str | None = Query(default=None),
        sort_by: str = Query(default="created_at"),
        sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),

        company_id: UUID | None = Query(default=None),
        branch_id: UUID | None = Query(default=None),
        category_id: UUID | None = Query(default=None),
        product_id: UUID | None = Query(default=None),
        employee_id: UUID | None = Query(default=None),
        period_id: UUID | None = Query(default=None),

        status_value: str | None = Query(default=None, alias="status"),
        is_active: bool | None = Query(default=None),

        date_from: date | None = Query(default=None),
        date_to: date | None = Query(default=None),

        db: AsyncSession = Depends(get_db),
        current_user: CurrentUser | None = Depends(view_permission)
        if view_permission
        else None,
    ):
        service = CRUDService(db, model_class)

        effective_company_id = _resolve_company_id(
            requested_company_id=company_id,
            current_user=current_user,
            model_class=model_class,
        )

        filters = _build_query_filters(
            model_class=model_class,
            branch_id=branch_id,
            category_id=category_id,
            product_id=product_id,
            employee_id=employee_id,
            period_id=period_id,
            status_value=status_value,
            is_active=is_active,
            date_from=date_from,
            date_to=date_to,
            date_filter_field=date_filter_field,
        )

        return await service.get_paginated(
            page=page,
            limit=limit,
            company_id=effective_company_id,
            filters=filters,
            search=q,
            search_fields=search_fields,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    @router.get(
        "/{item_id}",
        response_model=response_schema,
    )
    async def get_item(
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        current_user: CurrentUser | None = Depends(view_permission)
        if view_permission
        else None,
    ):
        service = CRUDService(db, model_class)

        item = await service.get_by_id(item_id)

        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data not found",
            )

        _validate_company_access(
            item=item,
            current_user=current_user,
        )

        return item

    @router.patch(
        "/{item_id}",
        response_model=response_schema,
    )
    async def update_item(
        item_id: UUID,
        payload: update_schema,
        db: AsyncSession = Depends(get_db),
        current_user: CurrentUser | None = Depends(update_permission)
        if update_permission
        else None,
    ):
        service = CRUDService(db, model_class)

        existing = await service.get_by_id(item_id)

        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data not found",
            )

        _validate_company_access(
            item=existing,
            current_user=current_user,
        )

        return await service.update(item_id, payload)

    @router.delete(
        "/{item_id}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    async def delete_item(
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        current_user: CurrentUser | None = Depends(delete_permission)
        if delete_permission
        else None,
    ):
        service = CRUDService(db, model_class)

        existing = await service.get_by_id(item_id)

        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data not found",
            )

        _validate_company_access(
            item=existing,
            current_user=current_user,
        )

        deleted = await service.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data not found",
            )

        return None

    return router