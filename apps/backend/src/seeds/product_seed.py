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
from src.seeds.data import PRODUCT_CATEGORIES_BY_COMPANY, PRODUCTS_BY_COMPANY
from src.seeds.utils import D, add_many_if_missing, sid


async def seed_products(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
):
    for ctx in contexts.values():
        # ============================================================
        # 1. PRODUCT CATEGORIES
        # Dibuat dulu karena Product.category_id butuh FK ke category.
        # ============================================================
        categories = []

        for key, code, name, description in PRODUCT_CATEGORIES_BY_COMPANY[ctx.code]:
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

        # ============================================================
        # 2. PRODUCTS
        # Dibuat sebelum stock karena ProductStock.product_id butuh FK.
        # ============================================================
        products = []

        for (
            key,
            sku,
            name,
            category_key,
            product_type,
            unit,
            cost_price,
            selling_price,
            track_stock,
        ) in PRODUCTS_BY_COMPANY[ctx.code]:
            products.append(
                Product(
                    id=ctx.product_ids[key],
                    company_id=ctx.company_id,
                    branch_id=None,
                    category_id=ctx.category_ids[category_key],
                    created_by_id=ctx.user_ids["admin"],
                    sku=sku,
                    barcode=f"BAR-{ctx.code.upper()}-{sku}",
                    name=name,
                    description=f"{ctx.code.upper()} demo product: {name}",
                    product_type=product_type,
                    unit=unit,
                    cost_price=D(cost_price),
                    selling_price=D(selling_price),
                    track_stock=track_stock,
                    status=ProductStatus.ACTIVE,
                    image_url=None,
                )
            )

        await add_many_if_missing(db, products)
        await db.flush()

        # ============================================================
        # 3. PRODUCT STOCKS + STOCK MOVEMENTS
        # company_id wajib diisi karena product_stocks.company_id NOT NULL.
        # ============================================================
        stocks = []
        movements = []

        for (
            key,
            sku,
            name,
            category_key,
            product_type,
            unit,
            cost_price,
            selling_price,
            track_stock,
        ) in PRODUCTS_BY_COMPANY[ctx.code]:
            if not track_stock:
                continue

            product_id = ctx.product_ids[key]

            if ctx.code == "nrt":
                branch_stock_map = {
                    "hq": "25",
                    "wh": "120",
                }
                reorder_point = "15"
                reserved_hq = "2"
                reserved_wh = "8"
            else:
                branch_stock_map = {
                    "hq": "40",
                    "wh": "250",
                }
                reorder_point = "50"
                reserved_hq = "4"
                reserved_wh = "15"

            for branch_key, qty in branch_stock_map.items():
                reserved_qty = reserved_hq if branch_key == "hq" else reserved_wh

                stocks.append(
                    ProductStock(
                        id=sid(f"product-stock:{ctx.code}:{key}:{branch_key}"),
                        company_id=ctx.company_id,
                        product_id=product_id,
                        branch_id=ctx.branch_ids[branch_key],
                        quantity_on_hand=D(qty),
                        reserved_quantity=D(reserved_qty),
                        reorder_point=D(reorder_point),
                    )
                )

                movements.append(
                    ProductStockMovement(
                        id=sid(
                            f"product-stock-movement:{ctx.code}:{key}:{branch_key}:opening"
                        ),
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
                        notes=f"Opening stock {ctx.code.upper()} - {name}",
                    )
                )

        await add_many_if_missing(db, stocks)
        await db.flush()

        await add_many_if_missing(db, movements)
        await db.flush()

    await db.flush()