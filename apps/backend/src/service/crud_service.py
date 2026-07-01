from math import ceil
from typing import Any
from uuid import UUID

from sqlalchemy import String, and_, asc, cast, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.pagination import PaginationMeta


class CRUDService:
    def __init__(self, db: AsyncSession, model_class: type):
        self.db = db
        self.model_class = model_class

    async def create(self, payload: Any):
        """
        Bisa menerima:
        - Pydantic schema: payload.model_dump()
        - dict: langsung dipakai

        Ini dibuat agar compatible dengan crud_factory.py yang sudah
        menambahkan company_id otomatis untuk user biasa.
        """
        data = self._to_dict(payload)

        item = self.model_class(**data)

        self.db.add(item)
        await self.db.commit()
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
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ):
        """
        Response:
        {
            "data": [...],
            "meta": {
                "total": 10,
                "page": 1,
                "limit": 20,
                "total_pages": 1,
                "has_next": false,
                "has_prev": false
            }
        }
        """
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        offset = (page - 1) * limit

        conditions = self._build_conditions(
            company_id=company_id,
            filters=filters,
            search=search,
            search_fields=search_fields,
        )

        data_query = select(self.model_class)
        total_query = select(func.count()).select_from(self.model_class)

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
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ):
        """
        Legacy support untuk endpoint lama yang masih pakai skip/limit.
        Untuk frontend baru, lebih baik pakai get_paginated().
        """
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
        )

        return result["data"]

    async def get_by_id(self, item_id: UUID):
        query = select(self.model_class).where(self.model_class.id == item_id)

        result = await self.db.execute(query)

        return result.scalar_one_or_none()

    async def update(self, item_id: UUID, payload: Any):
        """
        Bisa menerima:
        - Pydantic schema
        - dict
        """
        item = await self.get_by_id(item_id)

        if item is None:
            return None

        data = self._to_dict(payload, exclude_unset=True)

        for field, value in data.items():
            if hasattr(item, field):
                setattr(item, field, value)

        await self.db.commit()
        await self.db.refresh(item)

        return item

    async def delete(self, item_id: UUID) -> bool:
        item = await self.get_by_id(item_id)

        if item is None:
            return False

        await self.db.delete(item)
        await self.db.commit()

        return True

    def _build_conditions(
        self,
        *,
        company_id: UUID | None = None,
        filters: dict[str, Any] | None = None,
        search: str | None = None,
        search_fields: list[str] | None = None,
    ):
        conditions = []

        if company_id is not None and hasattr(self.model_class, "company_id"):
            conditions.append(self.model_class.company_id == company_id)

        if filters:
            conditions.extend(self._build_filter_conditions(filters))

        search = search.strip() if search else None

        if search and search_fields:
            search_conditions = []

            for field in search_fields:
                if not hasattr(self.model_class, field):
                    continue

                column = getattr(self.model_class, field)
                search_conditions.append(cast(column, String).ilike(f"%{search}%"))

            if search_conditions:
                conditions.append(or_(*search_conditions))

        return conditions

    def _build_filter_conditions(self, filters: dict[str, Any]):
        """
        Support filter sederhana:
        filters = {
            "is_active": True,
            "status": "paid",
            "category_id": uuid
        }

        Support filter operator:
        filters = {
            "price": {"gte": 10000, "lte": 50000},
            "status": {"in": ["paid", "pending"]},
            "name": {"ilike": "laptop"}
        }
        """
        conditions = []

        for field, value in filters.items():
            if value is None or value == "":
                continue

            if not hasattr(self.model_class, field):
                continue

            column = getattr(self.model_class, field)

            if isinstance(value, dict):
                conditions.extend(
                    self._build_operator_conditions(
                        column=column,
                        operators=value,
                    )
                )
            elif isinstance(value, list | tuple | set):
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

            elif operator == "in":
                if isinstance(value, list | tuple | set):
                    conditions.append(column.in_(list(value)))

            elif operator == "ilike":
                conditions.append(cast(column, String).ilike(f"%{value}%"))

        return conditions

    def _apply_sorting(
        self,
        *,
        query,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ):
        """
        Sorting dibuat aman:
        - hanya field yang benar-benar ada di model yang boleh dipakai
        - kalau sort_by tidak valid, query dikembalikan tanpa sorting
        """
        if not sort_by:
            return query

        if not hasattr(self.model_class, sort_by):
            return query

        sort_column = getattr(self.model_class, sort_by)

        if sort_order.lower() == "asc":
            return query.order_by(asc(sort_column))

        return query.order_by(desc(sort_column))

    def _to_dict(self, payload: Any, *, exclude_unset: bool = False) -> dict[str, Any]:
        """
        Helper supaya service bisa menerima Pydantic schema atau dict.
        """
        if isinstance(payload, dict):
            return payload

        if hasattr(payload, "model_dump"):
            return payload.model_dump(exclude_unset=exclude_unset)

        raise TypeError("Payload must be a dict or a Pydantic model")