from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.routes.crud_factory import create_crud_router
from src.modules.products.model_product import (
    Product,
    ProductCategory,
    ProductStock,
    ProductSupplier
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
    ProductSupplierCreate,
    ProductSupplierUpdate,
    ProductSupplierResponse,
)
from src.modules.products.service_product import ProductStockService
from src.security.dependencies import CurrentUser, require_permission
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    get_record_or_404,
    resolve_company_id,
    tenant_not_found,
)


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

router.include_router(
    create_crud_router(
        prefix="/products/suppliers",
        tags=["Product Suppliers"],
        permission_prefix="products.suppliers",
        model_class=ProductSupplier,
        create_schema=ProductSupplierCreate,
        update_schema=ProductSupplierUpdate,
        response_schema=ProductSupplierResponse,
        search_fields=["name", "category", "contact_person", "email", "phone"],
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
    company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=payload.company_id,
        required_for_superuser=True,
    )

    if company_id is None:
        raise tenant_not_found("Company not found")

    await ensure_branch_belongs_to_company(
        db=db,
        branch_id=payload.branch_id,
        company_id=company_id,
        current_user=current_user,
    )

    product = await get_record_or_404(
        db=db,
        model_class=Product,
        item_id=payload.product_id,
        detail="Product not found",
    )

    if product.company_id != company_id:
        raise tenant_not_found("Product not found")

    if product.branch_id is not None and product.branch_id != payload.branch_id:
        raise tenant_not_found("Product is not available in selected branch")

    secure_payload = payload.model_copy(
        update={
            "company_id": company_id,
            "created_by_id": current_user.user_id,
        }
    )

    service = ProductStockService(db)

    return await service.adjust_stock(
        secure_payload,
        company_id=company_id,
    )
