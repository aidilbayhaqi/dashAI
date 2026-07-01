from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.service.base_domain_service import BaseDomainService
from src.modules.products.model_product import (
    Product,
    ProductCategory,
    ProductStock,
    ProductStockMovement,
    StockMovementType,
)
from src.modules.products.schema_product import ProductStockMovementCreate


class ProductCategoryService(BaseDomainService):
    model_class = ProductCategory


class ProductService(BaseDomainService):
    model_class = Product

    async def search_products(self, company_id: UUID, keyword: str | None = None):
        query = select(Product).where(Product.company_id == company_id)

        if keyword:
            query = query.where(Product.name.ilike(f"%{keyword}%"))

        result = await self.db.execute(query.order_by(Product.name.asc()))
        return list(result.scalars().all())


class ProductStockService(BaseDomainService):
    model_class = ProductStock

    async def get_stock(self, product_id: UUID, branch_id: UUID):
        result = await self.db.execute(
            select(ProductStock).where(
                ProductStock.product_id == product_id,
                ProductStock.branch_id == branch_id,
            )
        )
        return result.scalar_one_or_none()

    async def adjust_stock(self, payload: ProductStockMovementCreate):
        stock = await self.get_stock(payload.product_id, payload.branch_id)

        if stock is None:
            stock = ProductStock(
                product_id=payload.product_id,
                branch_id=payload.branch_id,
                quantity_on_hand=Decimal("0.0000"),
            )
            self.db.add(stock)
            await self.db.flush()

        if payload.movement_type in [StockMovementType.IN, StockMovementType.PURCHASE]:
            stock.quantity_on_hand += payload.quantity
        elif payload.movement_type in [StockMovementType.OUT, StockMovementType.SALES]:
            stock.quantity_on_hand -= payload.quantity
        elif payload.movement_type == StockMovementType.ADJUSTMENT:
            stock.quantity_on_hand += payload.quantity

        total_cost = payload.quantity * payload.unit_cost

        movement = ProductStockMovement(
            **payload.model_dump(exclude={"total_cost"}),
            total_cost=total_cost,
        )

        self.db.add(movement)
        await self.db.commit()
        await self.db.refresh(movement)

        return movement