from math import ceil
from typing import Any
from uuid import UUID

from sqlalchemy import String, and_, asc, cast, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.pagination import PaginationMeta
from src.security.tenant import TenantParentConfig
from src.service.domain_integrity import commit_or_raise


class CRUDService:
    def __init__(self, db: AsyncSession, model_class: type):
        self.db = db
        self.model_class = model_class

    async def create(self, payload: Any):
        data = self._to_dict(payload)
        item = self.model_class(**data)

        self.db.add(item)

        await commit_or_raise(self.db)
        await self.db.refresh(item)

        return item

    async def get_paginated(
        self,
        *,
        page: int = 1,
        limit: int = 20,
        company_id: UUID | None = None,
        filters: dict[str, Any] | None = None,
        search: str | None = None,
        search_fields: list[str] | None = None,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
        allowed_branch_ids: set[UUID] | None = None,
        tenant_parent: TenantParentConfig | None = None,
    ):
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        offset = (page - 1) * limit

        data_query, total_query = self._build_base_queries(
            tenant_parent=tenant_parent,
        )

        conditions = self._build_conditions(
            company_id=company_id,
            filters=filters,
            search=search,
            search_fields=search_fields,
            allowed_branch_ids=allowed_branch_ids,
            tenant_parent=tenant_parent,
        )

        if conditions:
            data_query = data_query.where(and_(*conditions))
            total_query = total_query.where(and_(*conditions))

        total_result = await self.db.execute(total_query)
        total = total_result.scalar_one() or 0

        data_query = self._apply_sorting(
            query=data_query,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        data_query = data_query.offset(offset).limit(limit)

        result = await self.db.execute(data_query)
        data = list(result.scalars().all())

        total_pages = ceil(total / limit) if total > 0 else 1

        return {
            "data": data,
            "meta": PaginationMeta(
                total=total,
                page=page,
                limit=limit,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_prev=page > 1,
            ),
        }

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        company_id: UUID | None = None,
        filters: dict[str, Any] | None = None,
        search: str | None = None,
        search_fields: list[str] | None = None,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
        allowed_branch_ids: set[UUID] | None = None,
        tenant_parent: TenantParentConfig | None = None,
    ):
        limit = max(limit, 1)
        page = (skip // limit) + 1

        result = await self.get_paginated(
            page=page,
            limit=limit,
            company_id=company_id,
            filters=filters,
            search=search,
            search_fields=search_fields,
            sort_by=sort_by,
            sort_order=sort_order,
            allowed_branch_ids=allowed_branch_ids,
            tenant_parent=tenant_parent,
        )

        return result["data"]

    async def get_by_id(self, item_id: UUID):
        query = select(self.model_class).where(self.model_class.id == item_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update(self, item_id: UUID, payload: Any):
        item = await self.get_by_id(item_id)

        if item is None:
            return None

        data = self._to_dict(payload, exclude_unset=True)

        for field, value in data.items():
            if hasattr(item, field):
                setattr(item, field, value)

        await commit_or_raise(self.db)
        await self.db.refresh(item)

        return item

    async def delete(self, item_id: UUID) -> bool:
        item = await self.get_by_id(item_id)

        if item is None:
            return False

        await self.db.delete(item)

        await commit_or_raise(self.db)

        return True

    def _build_base_queries(
        self,
        *,
        tenant_parent: TenantParentConfig | None,
    ):
        data_query = select(self.model_class)
        total_query = select(func.count()).select_from(self.model_class)

        if tenant_parent is None:
            return data_query, total_query

        parent_model = tenant_parent.model_class
        parent_fk = getattr(self.model_class, tenant_parent.field_name)
        join_condition = parent_fk == parent_model.id

        data_query = data_query.join(parent_model, join_condition)
        total_query = total_query.join(parent_model, join_condition)

        return data_query, total_query

    def _build_conditions(
        self,
        *,
        company_id: UUID | None = None,
        filters: dict[str, Any] | None = None,
        search: str | None = None,
        search_fields: list[str] | None = None,
        allowed_branch_ids: set[UUID] | None = None,
        tenant_parent: TenantParentConfig | None = None,
    ):
        conditions = []
        company_column = self._resolve_column(
            "company_id",
            tenant_parent=tenant_parent,
        )
        branch_column = self._resolve_column(
            "branch_id",
            tenant_parent=tenant_parent,
        )

        if company_id is not None and company_column is not None:
            conditions.append(company_column == company_id)

        if allowed_branch_ids is not None and branch_column is not None:
            allowed_list = list(allowed_branch_ids)

            if allowed_list:
                conditions.append(
                    or_(
                        branch_column.is_(None),
                        branch_column.in_(allowed_list),
                    )
                )
            else:
                # User selected-branch tanpa assignment tetap boleh melihat
                # record company-wide yang branch_id-nya NULL.
                conditions.append(branch_column.is_(None))

        if filters:
            conditions.extend(
                self._build_filter_conditions(
                    filters,
                    tenant_parent=tenant_parent,
                )
            )

        search = search.strip() if search else None

        if search and search_fields:
            search_conditions = []

            for field in search_fields:
                if not hasattr(self.model_class, field):
                    continue

                column = getattr(self.model_class, field)
                search_conditions.append(
                    cast(column, String).ilike(f"%{search}%")
                )

            if search_conditions:
                conditions.append(or_(*search_conditions))

        return conditions

    def _resolve_column(
        self,
        field: str,
        *,
        tenant_parent: TenantParentConfig | None,
    ):
        if hasattr(self.model_class, field):
            return getattr(self.model_class, field)

        if tenant_parent and hasattr(tenant_parent.model_class, field):
            return getattr(tenant_parent.model_class, field)

        return None

    def _build_filter_conditions(
        self,
        filters: dict[str, Any],
        *,
        tenant_parent: TenantParentConfig | None,
    ):
        conditions = []

        for field, value in filters.items():
            if value is None or value == "":
                continue

            column = self._resolve_column(
                field,
                tenant_parent=tenant_parent,
            )

            if column is None:
                continue

            if isinstance(value, dict):
                conditions.extend(
                    self._build_operator_conditions(
                        column=column,
                        operators=value,
                    )
                )
            elif isinstance(value, (list, tuple, set)):
                conditions.append(column.in_(list(value)))
            else:
                conditions.append(column == value)

        return conditions

    def _build_operator_conditions(self, *, column, operators: dict[str, Any]):
        conditions = []

        for operator, value in operators.items():
            if value is None or value == "":
                continue

            operator = operator.lower()

            if operator == "eq":
                conditions.append(column == value)
            elif operator == "ne":
                conditions.append(column != value)
            elif operator == "gt":
                conditions.append(column > value)
            elif operator == "gte":
                conditions.append(column >= value)
            elif operator == "lt":
                conditions.append(column < value)
            elif operator == "lte":
                conditions.append(column <= value)
            elif operator == "in" and isinstance(value, (list, tuple, set)):
                conditions.append(column.in_(list(value)))
            elif operator == "ilike":
                conditions.append(cast(column, String).ilike(f"%{value}%"))

        return conditions

    def _apply_sorting(
        self,
        *,
        query,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
    ):
        resolved_sort_by = sort_by

        if not resolved_sort_by or not hasattr(self.model_class, resolved_sort_by):
            if hasattr(self.model_class, "updated_at"):
                resolved_sort_by = "updated_at"
            elif hasattr(self.model_class, "created_at"):
                resolved_sort_by = "created_at"
            else:
                return query

        sort_column = getattr(self.model_class, resolved_sort_by)
        primary_sort = (
            asc(sort_column)
            if sort_order.lower() == "asc"
            else desc(sort_column)
        )

        ordering = [primary_sort]

        # Keep pagination deterministic when multiple records share a timestamp.
        if resolved_sort_by != "created_at" and hasattr(self.model_class, "created_at"):
            ordering.append(desc(getattr(self.model_class, "created_at")))

        if hasattr(self.model_class, "id"):
            ordering.append(desc(getattr(self.model_class, "id")))

        return query.order_by(*ordering)

    def _to_dict(self, payload: Any, *, exclude_unset: bool = False) -> dict[str, Any]:
        if isinstance(payload, dict):
            return payload

        if hasattr(payload, "model_dump"):
            return payload.model_dump(exclude_unset=exclude_unset)

        raise TypeError("Payload must be a dict or a Pydantic model")
