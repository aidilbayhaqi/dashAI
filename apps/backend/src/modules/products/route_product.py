from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.routes.crud_factory import create_crud_router
from src.modules.products.model_product import (
    Product,
    ProductCategory,
    ProductStock,
)
from src.modules.products.schema_product import (
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCategoryResponse,
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductStockCreate,
    ProductStockUpdate,
    ProductStockResponse,
    ProductStockMovementCreate,
    ProductStockMovementResponse,
)
from src.modules.products.service_product import ProductStockService
from src.security.dependencies import CurrentUser, require_permission


router = APIRouter(tags=["Products & Inventory"])


router.include_router(
    create_crud_router(
        prefix="/products/categories",
        tags=["Product Categories"],
        permission_prefix="products.categories",
        model_class=ProductCategory,
        create_schema=ProductCategoryCreate,
        update_schema=ProductCategoryUpdate,
        response_schema=ProductCategoryResponse,
        search_fields=["code", "name", "description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/products/items",
        tags=["Products"],
        permission_prefix="products.products",
        model_class=Product,
        create_schema=ProductCreate,
        update_schema=ProductUpdate,
        response_schema=ProductResponse,
        search_fields=["sku", "barcode", "name", "description", "unit"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/products/stocks",
        tags=["Product Stocks"],
        permission_prefix="products.stock",
        model_class=ProductStock,
        create_schema=ProductStockCreate,
        update_schema=ProductStockUpdate,
        response_schema=ProductStockResponse,
        search_fields=[],
        date_filter_field="updated_at",
    )
)


@router.post(
    "/products/stock-movements",
    response_model=ProductStockMovementResponse,
)
async def create_stock_movement(
    payload: ProductStockMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("products.movements.create")
    ),
):
    service = ProductStockService(db)
    return await service.adjust_stock(payload)