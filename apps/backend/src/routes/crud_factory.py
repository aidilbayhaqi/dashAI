from datetime import date, datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.schemas.pagination import PaginatedResponse
from src.security.dependencies import CurrentUser, require_permission
from src.security.idempotency import (
    build_idempotency_context,
    execute_idempotent,
    get_idempotency_key,
)
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    ensure_item_access,
    resolve_branch_query_scope,
    resolve_company_id,
    resolve_create_company_id,
    validate_payload_tenant_references,
)
from src.security.tenant_registry import get_model_tenant_config
from src.service.crud_service import CRUDService


def _permission_dependency(permission_prefix: str | None, action: str):
    if not permission_prefix:
        return None

    return require_permission(f"{permission_prefix}.{action}")


def _build_query_filters(
    *,
    model_class: type,
    tenant_parent,
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

        exists_on_model = hasattr(model_class, field)
        exists_on_parent = bool(
            tenant_parent and hasattr(tenant_parent.model_class, field)
        )

        if exists_on_model or exists_on_parent:
            filters[field] = value

    date_field_exists = hasattr(model_class, date_filter_field) or bool(
        tenant_parent and hasattr(tenant_parent.model_class, date_filter_field)
    )

    if date_field_exists:
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

    tenant_config = get_model_tenant_config(model_class)
    tenant_parent = tenant_config.tenant_parent

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
        request: Request,
        idempotency_key: str = Depends(get_idempotency_key),
        db: AsyncSession = Depends(get_db),
        current_user: CurrentUser | None = Depends(create_permission)
        if create_permission
        else None,
    ):
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication is required",
            )

        context = await build_idempotency_context(
            request=request,
            current_user=current_user,
            raw_key=idempotency_key,
        )

        async def operation():
            service = CRUDService(db, model_class)
            data = payload.model_dump()

            company_id = await resolve_create_company_id(
                db=db,
                data=data,
                model_class=model_class,
                current_user=current_user,
                tenant_parent=tenant_parent,
            )

            for field_name in tenant_config.current_user_fields:
                if hasattr(model_class, field_name) or field_name in data:
                    data[field_name] = current_user.user_id

            await validate_payload_tenant_references(
                db=db,
                data=data,
                company_id=company_id,
                current_user=current_user,
                tenant_relations=tenant_config.tenant_relations,
                user_company_fields=set(tenant_config.user_company_fields),
            )

            return await service.create(data)

        return await execute_idempotent(
            context=context,
            operation=operation,
            response_model=response_schema,
            success_status_code=status.HTTP_201_CREATED,
        )

    @router.get(
        "",
        response_model=PaginatedResponse[response_schema],
    )
    async def get_items(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, ge=1, le=100),
        q: str | None = Query(default=None),
        sort_by: str = Query(default="updated_at"),
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

        if current_user is None:
            effective_company_id = company_id
            effective_branch_id = branch_id
            allowed_branch_ids = None
        else:
            is_tenant_scoped = hasattr(model_class, "company_id") or tenant_parent

            effective_company_id = (
                resolve_company_id(
                    current_user=current_user,
                    requested_company_id=company_id,
                )
                if is_tenant_scoped
                else None
            )

            effective_branch_id, allowed_branch_ids = resolve_branch_query_scope(
                current_user=current_user,
                requested_branch_id=branch_id,
            )

            if effective_branch_id is not None and effective_company_id is not None:
                await ensure_branch_belongs_to_company(
                    db=db,
                    branch_id=effective_branch_id,
                    company_id=effective_company_id,
                    current_user=current_user,
                )

        filters = _build_query_filters(
            model_class=model_class,
            tenant_parent=tenant_parent,
            branch_id=effective_branch_id,
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
            allowed_branch_ids=allowed_branch_ids,
            tenant_parent=tenant_parent,
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

        if current_user is not None:
            await ensure_item_access(
                db=db,
                item=item,
                current_user=current_user,
                tenant_parent=tenant_parent,
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

        data = payload.model_dump(exclude_unset=True)

        if current_user is not None:
            company_id, _ = await ensure_item_access(
                db=db,
                item=existing,
                current_user=current_user,
                tenant_parent=tenant_parent,
            )

            if "company_id" in data and data["company_id"] != company_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="company_id cannot be changed",
                )

            await validate_payload_tenant_references(
                db=db,
                data=data,
                company_id=company_id,
                current_user=current_user,
                tenant_relations=tenant_config.tenant_relations,
                user_company_fields=set(tenant_config.user_company_fields),
            )

        updated = await service.update(item_id, data)

        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data not found",
            )

        return updated

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

        if current_user is not None:
            await ensure_item_access(
                db=db,
                item=existing,
                current_user=current_user,
                tenant_parent=tenant_parent,
            )

        deleted = await service.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data not found",
            )

        return None

    return router
