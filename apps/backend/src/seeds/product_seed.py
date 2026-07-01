from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.products.model_product import (
    Product,
    ProductCategory,
    ProductStatus,
    ProductStock,
    ProductStockMovement,
    StockMovementType,
)
from src.seeds.context import CompanySeedContext
from src.seeds.data import PRODUCT_CATEGORIES, PRODUCTS
from src.seeds.utils import D, add_many_if_missing, sid


async def seed_products(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
):
    for ctx in contexts.values():
        categories = []

        for key, code, name, description in PRODUCT_CATEGORIES:
            categories.append(
                ProductCategory(
                    id=ctx.category_ids[key],
                    company_id=ctx.company_id,
                    parent_category_id=None,
                    code=code,
                    name=name,
                    description=description,
                    is_active=True,
                )
            )

        await add_many_if_missing(db, categories)
        await db.flush()

        products = []
        stocks = []
        movements = []

        for key, sku, name, category_key, product_type, unit, cost_price, selling_price, track_stock in PRODUCTS:
            product_id = ctx.product_ids[key]

            products.append(
                Product(
                    id=product_id,
                    company_id=ctx.company_id,
                    branch_id=None,
                    category_id=ctx.category_ids[category_key],
                    created_by_id=ctx.user_ids["admin"],
                    sku=sku,
                    barcode=f"BAR-{ctx.code.upper()}-{sku}",
                    name=name,
                    description=f"Sample product {name}",
                    product_type=product_type,
                    unit=unit,
                    cost_price=D(cost_price),
                    selling_price=D(selling_price),
                    track_stock=track_stock,
                    status=ProductStatus.ACTIVE,
                )
            )

            if track_stock:
                for branch_key, qty in [("hq", "20"), ("wh", "100")]:
                    stocks.append(
                        ProductStock(
                            id=sid(f"product-stock:{ctx.code}:{key}:{branch_key}"),
                            product_id=product_id,
                            branch_id=ctx.branch_ids[branch_key],
                            quantity_on_hand=D(qty),
                            reserved_quantity=D("0"),
                            reorder_point=D("10"),
                        )
                    )

                    movements.append(
                        ProductStockMovement(
                            id=sid(f"product-stock-movement:{ctx.code}:{key}:{branch_key}:opening"),
                            company_id=ctx.company_id,
                            branch_id=ctx.branch_ids[branch_key],
                            product_id=product_id,
                            created_by_id=ctx.user_ids["warehouse"],
                            movement_type=StockMovementType.IN,
                            movement_date=datetime(2026, 1, 1, 9, 0),
                            quantity=D(qty),
                            unit_cost=D(cost_price),
                            total_cost=D(qty) * D(cost_price),
                            source_module="seed",
                            source_id=None,
                            notes="Saldo awal stok sample",
                        )
                    )

        await add_many_if_missing(db, products)
        await db.flush()

        await add_many_if_missing(db, stocks)
        await add_many_if_missing(db, movements)

    await db.flush()