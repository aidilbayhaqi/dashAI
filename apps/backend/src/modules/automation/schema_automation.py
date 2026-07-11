from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from src.modules.automation.model_automation import (
    DomainEventStatus,
    SalesOrderStatus,
)


class ORMBase(BaseModel):
    model_config = {"from_attributes": True}


class SalesOrderItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(default=Decimal("1.0000"), gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    description: str | None = None


class SalesOrderCreate(BaseModel):
    company_id: UUID
    branch_id: UUID
    order_no: str | None = None
    customer_name: str = Field(min_length=2, max_length=180)
    order_date: date = Field(default_factory=date.today)
    due_date: date | None = None
    creation_mode: Literal["manual", "automatic"] = "manual"
    auto_process: bool = True
    notes: str | None = None
    items: list[SalesOrderItemCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_order(self):
        if self.due_date is not None and self.due_date < self.order_date:
            raise ValueError("Sales order due date cannot precede order date")

        product_ids = [item.product_id for item in self.items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("A product may only appear once in a sales order")

        return self


class SalesOrderProcessRequest(BaseModel):
    note: str | None = None


class SalesOrderItemResponse(ORMBase):
    id: UUID
    sales_order_id: UUID
    product_id: UUID
    description: str | None
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal


class SalesOrderResponse(ORMBase):
    id: UUID
    company_id: UUID
    branch_id: UUID
    order_no: str
    customer_name: str
    order_date: date
    due_date: date | None
    status: SalesOrderStatus
    creation_mode: str
    auto_process: bool
    subtotal_amount: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    transaction_id: UUID | None
    invoice_id: UUID | None
    created_by: UUID | None
    approved_by: UUID | None
    approved_at: datetime | None
    fulfilled_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    items: list[SalesOrderItemResponse] = Field(default_factory=list)


class DomainEventResponse(ORMBase):
    id: UUID
    company_id: UUID
    aggregate_type: str
    aggregate_id: UUID
    event_type: str
    event_key: str
    payload: dict
    status: DomainEventStatus
    attempts: int
    occurred_at: datetime
    processed_at: datetime | None
    last_error: str | None
