from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.products.model_product import Product, ProductStock
from src.security.dependencies import CurrentUser
from src.service.write_policy import CRUDWritePolicy


class ProductStockWritePolicy(CRUDWritePolicy):
    async def before_create(
        self,
        *,
        db: AsyncSession,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del current_user

        product_id = UUID(str(data["product_id"]))
        branch_id = UUID(str(data["branch_id"]))
        company_id = UUID(str(data["company_id"]))

        product = await db.get(Product, product_id)
        if product is None or product.company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )

        if product.branch_id is not None and product.branch_id != branch_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Product {product.name} is only available in its assigned branch"
                ),
            )

        existing = await db.scalar(
            select(ProductStock.id).where(
                ProductStock.company_id == company_id,
                ProductStock.product_id == product_id,
                ProductStock.branch_id == branch_id,
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Stock is already configured for this product and branch. "
                    "Edit the existing stock record or create a stock movement."
                ),
            )

        return data
