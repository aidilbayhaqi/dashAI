from typing import Any
from uuid import UUID

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


class BaseDomainService:
    model_class = None

    def __init__(self, db: AsyncSession):
        if self.model_class is None:
            raise ValueError("model_class must be defined in child service")

        self.db = db

    async def create(self, payload: Any):
        data = payload.model_dump()
        item = self.model_class(**data)

        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)

        return item

    async def get_by_id(self, item_id: UUID):
        query = select(self.model_class).where(self.model_class.id == item_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        *,
        company_id: UUID | None = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        filters: dict[str, Any] | None = None,
        search: str | None = None,
        search_fields: list[str] | None = None,
    ):
        page = max(page, 1)
        page_size = min(max(page_size, 1), 200)

        query = select(self.model_class)
        conditions = []

        if company_id is not None and hasattr(self.model_class, "company_id"):
            conditions.append(self.model_class.company_id == company_id)

        if filters:
            for field, value in filters.items():
                if value is None:
                    continue

                if hasattr(self.model_class, field):
                    conditions.append(getattr(self.model_class, field) == value)

        if search and search_fields:
            search_conditions = []

            for field in search_fields:
                if hasattr(self.model_class, field):
                    search_conditions.append(
                        getattr(self.model_class, field).ilike(f"%{search}%")
                    )

            if search_conditions:
                conditions.append(or_(*search_conditions))

        if conditions:
            query = query.where(and_(*conditions))

        if sort_by and hasattr(self.model_class, sort_by):
            sort_column = getattr(self.model_class, sort_by)
            query = query.order_by(
                asc(sort_column) if sort_order.lower() == "asc" else desc(sort_column)
            )

        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(self, item_id: UUID, payload: Any):
        item = await self.get_by_id(item_id)

        if item is None:
            return None

        data = payload.model_dump(exclude_unset=True)

        for field, value in data.items():
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