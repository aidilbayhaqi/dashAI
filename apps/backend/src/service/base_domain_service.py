from typing import Any
from uuid import UUID

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.realtime.events import publish_realtime_event_safe


class BaseDomainService:
    model_class = None

    def __init__(self, db: AsyncSession):
        if self.model_class is None:
            raise ValueError("model_class must be defined in child service")

        self.db = db


    def _realtime_module(self) -> str:
        module_path = str(getattr(self.model_class, "__module__", ""))
        parts = module_path.split(".")
        if "modules" in parts:
            index = parts.index("modules")
            if len(parts) > index + 1:
                return parts[index + 1]
        return "system"

    async def _publish_change(
        self,
        action: str,
        item: Any,
        *,
        item_id: Any | None = None,
        company_id: Any | None = None,
    ) -> None:
        resolved_id = item_id or getattr(item, "id", None)
        resolved_company_id = company_id or getattr(item, "company_id", None)
        resolved_branch_id = getattr(item, "branch_id", None)
        model_name = self.model_class.__name__.lower()
        module = self._realtime_module()
        await publish_realtime_event_safe(
            f"{module}.{model_name}.{action}",
            {
                "id": str(resolved_id) if resolved_id else None,
                "action": action,
                "branch_id": (
                    str(resolved_branch_id)
                    if resolved_branch_id is not None
                    else None
                ),
            },
            company_id=resolved_company_id,
            module=module,
        )

    async def create(self, payload: Any):
        data = payload.model_dump()
        item = self.model_class(**data)

        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)

        await self._publish_change("created", item)
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
        sort_by: str = "updated_at",
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

        resolved_sort_by = sort_by
        if not resolved_sort_by or not hasattr(self.model_class, resolved_sort_by):
            if hasattr(self.model_class, "updated_at"):
                resolved_sort_by = "updated_at"
            elif hasattr(self.model_class, "created_at"):
                resolved_sort_by = "created_at"
            else:
                resolved_sort_by = None

        if resolved_sort_by:
            sort_column = getattr(self.model_class, resolved_sort_by)
            ordering = [
                asc(sort_column)
                if sort_order.lower() == "asc"
                else desc(sort_column)
            ]

            if resolved_sort_by != "created_at" and hasattr(self.model_class, "created_at"):
                ordering.append(desc(getattr(self.model_class, "created_at")))

            if hasattr(self.model_class, "id"):
                ordering.append(desc(getattr(self.model_class, "id")))

            query = query.order_by(*ordering)

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

        await self._publish_change("updated", item)
        return item

    async def delete(self, item_id: UUID) -> bool:
        item = await self.get_by_id(item_id)

        if item is None:
            return False

        item_id_value = getattr(item, "id", item_id)
        company_id = getattr(item, "company_id", None)

        await self.db.delete(item)
        await self.db.commit()
        await self._publish_change(
            "deleted",
            item,
            item_id=item_id_value,
            company_id=company_id,
        )

        return True
