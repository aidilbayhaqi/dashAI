from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.company.model_company import CompanyBranch
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
from src.modules.products.policy_product import ProductStockWritePolicy
from src.modules.products.service_product import ProductStockService
from src.security.dependencies import CurrentUser, require_permission
from src.security.idempotency import (
    build_idempotency_context,
    execute_idempotent,
    get_idempotency_key,
)
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
        write_policy=ProductStockWritePolicy(),
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


@router.get("/products/items/{product_id}/available-branches")
async def get_product_available_branches(
    product_id: UUID,
    company_id: UUID | None = None,
    purpose: str = "usage",
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("products.products.view")
    ),
):
    resolved_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=company_id,
        required_for_superuser=True,
    )
    if resolved_company_id is None:
        raise tenant_not_found("Company not found")

    product = await get_record_or_404(
        db=db,
        model_class=Product,
        item_id=product_id,
        detail="Product not found",
    )
    if product.company_id != resolved_company_id:
        raise tenant_not_found("Product not found")

    stock_branch_ids = list(
        (
            await db.scalars(
                select(ProductStock.branch_id)
                .where(
                    ProductStock.company_id == resolved_company_id,
                    ProductStock.product_id == product.id,
                )
                .distinct()
            )
        ).all()
    )

    if purpose == "stock_create":
        if product.branch_id is not None:
            candidates = [product.branch_id]
            strategy = "product_assignment"
        else:
            candidates = list(
                (
                    await db.scalars(
                        select(CompanyBranch.id).where(
                            CompanyBranch.company_id == resolved_company_id,
                            CompanyBranch.is_active.is_(True),
                        )
                    )
                ).all()
            )
            strategy = "company_wide"

        configured = set(stock_branch_ids)
        branch_ids = [
            branch_id for branch_id in candidates
            if branch_id not in configured
        ]
    elif product.branch_id is not None:
        branch_ids = [product.branch_id]
        strategy = "product_assignment"
    elif stock_branch_ids:
        branch_ids = stock_branch_ids
        strategy = "configured_stock"
    else:
        branch_ids = list(
            (
                await db.scalars(
                    select(CompanyBranch.id).where(
                        CompanyBranch.company_id == resolved_company_id,
                        CompanyBranch.is_active.is_(True),
                    )
                )
            ).all()
        )
        strategy = "company_wide"

    allowed_branch_ids = current_user.allowed_branch_ids
    if allowed_branch_ids is not None:
        branch_ids = [
            branch_id for branch_id in branch_ids
            if branch_id in allowed_branch_ids
        ]

    branches = list(
        (
            await db.scalars(
                select(CompanyBranch)
                .where(
                    CompanyBranch.company_id == resolved_company_id,
                    CompanyBranch.id.in_(branch_ids),
                    CompanyBranch.is_active.is_(True),
                )
                .order_by(CompanyBranch.name.asc())
            )
        ).all()
    ) if branch_ids else []

    return {
        "product_id": str(product.id),
        "strategy": strategy,
        "data": [
            {
                "id": str(branch.id),
                "company_id": str(branch.company_id),
                "code": branch.code,
                "name": branch.name,
            }
            for branch in branches
        ],
    }


@router.post(
    "/products/stock-movements",
    response_model=ProductStockMovementResponse,
)
async def create_stock_movement(
    payload: ProductStockMovementCreate,
    request: Request,
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("products.movements.create")
    ),
):
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
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

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=ProductStockMovementResponse,
    )
