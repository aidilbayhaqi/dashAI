from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, model_validator

from src.modules.products.model_product import (
    ProductStatus,
    ProductType,
    StockMovementType,
    ProductSupplierStatus,
)


class ORMBase(BaseModel):
    model_config = {"from_attributes": True}


class ProductCategoryCreate(BaseModel):
    company_id: UUID
    parent_category_id: UUID | None = None
    code: str
    name: str
    description: str | None = None
    is_active: bool = True


class ProductCategoryUpdate(BaseModel):
    parent_category_id: UUID | None = None
    code: str | None = None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class ProductCategoryResponse(ProductCategoryCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ProductCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    category_id: UUID | None = None
    created_by_id: UUID | None = None
    sku: str
    barcode: str | None = None
    name: str
    description: str | None = None
    image_url: str | None = None
    product_type: ProductType = ProductType.PHYSICAL
    unit: str = "pcs"
    cost_price: Decimal = Decimal("0.00")
    selling_price: Decimal = Decimal("0.00")
    track_stock: bool = True
    status: ProductStatus = ProductStatus.ACTIVE

    @model_validator(mode="after")
    def validate_prices(self):
        if self.cost_price < 0 or self.selling_price < 0:
            raise ValueError("Product prices cannot be negative")
        return self


class ProductUpdate(BaseModel):
    branch_id: UUID | None = None
    category_id: UUID | None = None
    sku: str | None = None
    barcode: str | None = None
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    product_type: ProductType | None = None
    unit: str | None = None
    cost_price: Decimal | None = None
    selling_price: Decimal | None = None
    track_stock: bool | None = None
    status: ProductStatus | None = None


class ProductResponse(ProductCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ProductStockCreate(BaseModel):
    company_id: UUID
    product_id: UUID
    branch_id: UUID
    quantity_on_hand: Decimal = Decimal("0.0000")
    reserved_quantity: Decimal = Decimal("0.0000")
    reorder_point: Decimal = Decimal("0.0000")

    @model_validator(mode="after")
    def validate_stock_quantities(self):
        values = (
            self.quantity_on_hand,
            self.reserved_quantity,
            self.reorder_point,
        )
        if any(value < 0 for value in values):
            raise ValueError("Stock quantities cannot be negative")
        if self.reserved_quantity > self.quantity_on_hand:
            raise ValueError(
                "Reserved quantity cannot exceed quantity on hand"
            )
        return self


class ProductStockUpdate(BaseModel):
    quantity_on_hand: Decimal | None = None
    reserved_quantity: Decimal | None = None
    reorder_point: Decimal | None = None


class ProductStockResponse(ProductStockCreate, ORMBase):
    id: UUID
    updated_at: datetime


class ProductStockMovementCreate(BaseModel):
    company_id: UUID
    branch_id: UUID
    product_id: UUID
    created_by_id: UUID | None = None
    movement_type: StockMovementType
    quantity: Decimal
    unit_cost: Decimal = Decimal("0.00")
    total_cost: Decimal = Decimal("0.00")
    source_module: str | None = None
    source_id: UUID | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_movement_values(self):
        if self.unit_cost < 0:
            raise ValueError("Unit cost cannot be negative")
        if self.movement_type == StockMovementType.ADJUSTMENT:
            if self.quantity == 0:
                raise ValueError("Adjustment quantity cannot be zero")
        elif self.quantity <= 0:
            raise ValueError("Movement quantity must be greater than zero")
        return self


class ProductStockMovementResponse(ProductStockMovementCreate, ORMBase):
    id: UUID
    movement_date: datetime

class ProductSupplierCreate(BaseModel):
    company_id: UUID
    name: str
    category: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    lead_time_days: int = 0
    status: ProductSupplierStatus = ProductSupplierStatus.ACTIVE

    @model_validator(mode="after")
    def validate_lead_time(self):
        if self.lead_time_days < 0:
            raise ValueError("Lead time cannot be negative")
        return self


class ProductSupplierUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    lead_time_days: int | None = None
    status: ProductSupplierStatus | None = None


class ProductSupplierResponse(ProductSupplierCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime