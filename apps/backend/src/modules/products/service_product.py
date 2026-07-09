import hashlib
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
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
from src.service.domain_integrity import (
    commit_or_raise,
    ensure_non_negative,
    ensure_non_zero,
    ensure_positive,
    flush_or_raise,
)


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

    @staticmethod
    def _stock_lock_key(
        *,
        company_id: UUID,
        product_id: UUID,
        branch_id: UUID,
    ) -> int:
        raw = f"{company_id}:{product_id}:{branch_id}".encode("utf-8")
        digest = hashlib.blake2b(raw, digest_size=8).digest()
        return int.from_bytes(digest, byteorder="big", signed=True)

    async def _acquire_stock_lock(
        self,
        *,
        company_id: UUID,
        product_id: UUID,
        branch_id: UUID,
    ) -> None:
        lock_key = self._stock_lock_key(
            company_id=company_id,
            product_id=product_id,
            branch_id=branch_id,
        )
        await self.db.execute(
            select(func.pg_advisory_xact_lock(lock_key))
        )

    async def get_stock(
        self,
        *,
        company_id: UUID,
        product_id: UUID,
        branch_id: UUID,
        for_update: bool = False,
    ):
        query = select(ProductStock).where(
            ProductStock.company_id == company_id,
            ProductStock.product_id == product_id,
            ProductStock.branch_id == branch_id,
        )

        if for_update:
            query = query.with_for_update()

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def adjust_stock(
        self,
        payload: ProductStockMovementCreate,
        *,
        company_id: UUID,
    ):
        quantity = Decimal(payload.quantity)
        unit_cost = Decimal(payload.unit_cost)

        ensure_non_negative(unit_cost, field_name="unit_cost")

        if payload.movement_type == StockMovementType.ADJUSTMENT:
            ensure_non_zero(quantity, field_name="quantity")
        else:
            ensure_positive(quantity, field_name="quantity")

        await self._acquire_stock_lock(
            company_id=company_id,
            product_id=payload.product_id,
            branch_id=payload.branch_id,
        )

        stock = await self.get_stock(
            company_id=company_id,
            product_id=payload.product_id,
            branch_id=payload.branch_id,
            for_update=True,
        )

        if stock is None:
            stock = ProductStock(
                company_id=company_id,
                product_id=payload.product_id,
                branch_id=payload.branch_id,
                quantity_on_hand=Decimal("0.0000"),
                reserved_quantity=Decimal("0.0000"),
                reorder_point=Decimal("0.0000"),
            )
            self.db.add(stock)
            await flush_or_raise(self.db)

        current_quantity = Decimal(stock.quantity_on_hand)

        if payload.movement_type in {
            StockMovementType.IN,
            StockMovementType.PURCHASE,
        }:
            next_quantity = current_quantity + quantity
        elif payload.movement_type in {
            StockMovementType.OUT,
            StockMovementType.SALES,
        }:
            next_quantity = current_quantity - quantity
        else:
            next_quantity = current_quantity + quantity

        if next_quantity < 0:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stock cannot become negative",
            )

        if next_quantity < Decimal(stock.reserved_quantity):
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stock cannot be lower than reserved quantity",
            )

        stock.quantity_on_hand = next_quantity
        total_cost = quantity * unit_cost

        movement_data = payload.model_dump(
            exclude={"total_cost", "company_id"}
        )
        movement = ProductStockMovement(
            **movement_data,
            company_id=company_id,
            total_cost=total_cost,
        )
        self.db.add(movement)

        await commit_or_raise(self.db)
        await self.db.refresh(movement)
        return movement
