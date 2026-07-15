from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from math import ceil
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.time import utc_now_naive
from src.modules.automation.model_automation import (
    DomainEventOutbox,
    DomainEventStatus,
    SalesOrder,
    SalesOrderItem,
    SalesOrderStatus,
)
from src.modules.automation.schema_automation import SalesOrderCreate
from src.modules.finance.model_finance import (
    CashflowActivity,
    FinanceCashAccount,
    FinanceInvoice,
    FinanceTransaction,
    InvoiceStatus,
    TransactionStatus,
    TransactionType,
)
from src.modules.products.model_product import (
    Product,
    ProductStock,
    ProductStockMovement,
    ProductType,
    StockMovementType,
)


MONEY = Decimal("0.01")
QUANTITY = Decimal("0.0001")


def money(value: Decimal | int | str) -> Decimal:
    return Decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)


def quantity(value: Decimal | int | str) -> Decimal:
    return Decimal(value).quantize(QUANTITY, rounding=ROUND_HALF_UP)


class BusinessAutomationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _resolve_active_cash_account(
        self,
        *,
        company_id: UUID,
    ) -> FinanceCashAccount:
        """Return the deterministic default cash account for automation.

        Sales automation must never create a finance transaction without a
        cash account. We prefer an account whose name indicates the primary
        operational account, then fall back to the oldest active account.
        """
        priority = case(
            (func.lower(FinanceCashAccount.name).like("%utama%"), 0),
            (func.lower(FinanceCashAccount.name).like("%operasional%"), 1),
            (func.lower(FinanceCashAccount.name).like("%bank%"), 2),
            else_=3,
        )
        result = await self.db.execute(
            select(FinanceCashAccount)
            .where(
                FinanceCashAccount.company_id == company_id,
                FinanceCashAccount.is_active.is_(True),
            )
            .order_by(
                priority,
                FinanceCashAccount.created_at.asc(),
                FinanceCashAccount.name.asc(),
                FinanceCashAccount.id.asc(),
            )
            .limit(1)
        )
        cash_account = result.scalar_one_or_none()

        if cash_account is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Sales automation requires an active cash account. "
                    "Create or activate one in Finance > Cash Accounts first."
                ),
            )

        return cash_account

    async def _get_order(
        self,
        *,
        order_id: UUID,
        company_id: UUID,
        for_update: bool = False,
    ) -> SalesOrder | None:
        query = (
            select(SalesOrder)
            .where(
                SalesOrder.id == order_id,
                SalesOrder.company_id == company_id,
            )
            .options(selectinload(SalesOrder.items))
        )

        if for_update:
            query = query.with_for_update()

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_order(
        self,
        *,
        order_id: UUID,
        company_id: UUID,
    ) -> SalesOrder | None:
        return await self._get_order(
            order_id=order_id,
            company_id=company_id,
        )

    async def _get_order_items(
        self,
        *,
        order_id: UUID,
    ) -> list[SalesOrderItem]:
        result = await self.db.execute(
            select(SalesOrderItem)
            .where(SalesOrderItem.sales_order_id == order_id)
            .order_by(SalesOrderItem.id)
        )
        return list(result.scalars().all())

    async def list_orders(
        self,
        *,
        company_id: UUID,
        page: int = 1,
        limit: int = 20,
        query_text: str | None = None,
    ) -> dict:
        page = max(page, 1)
        limit = min(max(limit, 1), 100)

        filters = [SalesOrder.company_id == company_id]

        if query_text:
            keyword = f"%{query_text.strip()}%"
            filters.append(
                SalesOrder.order_no.ilike(keyword)
                | SalesOrder.customer_name.ilike(keyword)
            )

        count_result = await self.db.execute(
            select(func.count(SalesOrder.id)).where(*filters)
        )
        total = int(count_result.scalar_one())

        result = await self.db.execute(
            select(SalesOrder)
            .where(*filters)
            .options(selectinload(SalesOrder.items))
            .order_by(SalesOrder.updated_at.desc(), SalesOrder.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = list(result.scalars().unique().all())
        total_pages = ceil(total / limit) if total else 0

        return {
            "data": rows,
            "meta": {
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        }

    async def list_events(
        self,
        *,
        company_id: UUID,
        aggregate_id: UUID | None = None,
        limit: int = 100,
    ) -> list[DomainEventOutbox]:
        query = select(DomainEventOutbox).where(
            DomainEventOutbox.company_id == company_id
        )

        if aggregate_id is not None:
            query = query.where(
                DomainEventOutbox.aggregate_id == aggregate_id
            )

        result = await self.db.execute(
            query.order_by(DomainEventOutbox.occurred_at.desc()).limit(
                min(max(limit, 1), 200)
            )
        )
        return list(result.scalars().all())

    @staticmethod
    def _enum_value(value) -> str | None:
        if value is None:
            return None
        return str(getattr(value, "value", value))

    def _build_monitoring_row(
        self,
        *,
        order: SalesOrder,
        transaction: FinanceTransaction | None,
        invoice: FinanceInvoice | None,
    ) -> dict:
        invoice_total = money(invoice.total_amount) if invoice else money(order.total_amount)
        paid_amount = money(invoice.paid_amount) if invoice else Decimal("0.00")
        outstanding_amount = money(max(invoice_total - paid_amount, Decimal("0.00")))

        if invoice and (
            invoice.status == InvoiceStatus.PAID
            or paid_amount >= invoice_total
        ):
            payment_status = "paid"
        elif paid_amount > 0:
            payment_status = "partial"
        else:
            payment_status = "unpaid"

        updated_candidates = [order.updated_at]
        if transaction is not None:
            updated_candidates.append(transaction.updated_at)
        if invoice is not None:
            updated_candidates.append(invoice.updated_at)

        return {
            "order_id": order.id,
            "order_no": order.order_no,
            "customer_name": order.customer_name,
            "total_amount": money(order.total_amount),
            "order_status": self._enum_value(order.status),
            "transaction_id": transaction.id if transaction else None,
            "transaction_no": transaction.transaction_no if transaction else None,
            "transaction_status": self._enum_value(transaction.status) if transaction else None,
            "invoice_id": invoice.id if invoice else None,
            "invoice_no": invoice.invoice_no if invoice else None,
            "invoice_status": self._enum_value(invoice.status) if invoice else None,
            "paid_amount": paid_amount,
            "outstanding_amount": outstanding_amount,
            "payment_status": payment_status,
            "created_at": order.created_at,
            "updated_at": max(updated_candidates),
        }

    async def list_monitoring(
        self,
        *,
        company_id: UUID,
        limit: int = 200,
    ) -> list[dict]:
        result = await self.db.execute(
            select(SalesOrder, FinanceTransaction, FinanceInvoice)
            .outerjoin(
                FinanceTransaction,
                FinanceTransaction.id == SalesOrder.transaction_id,
            )
            .outerjoin(
                FinanceInvoice,
                FinanceInvoice.id == SalesOrder.invoice_id,
            )
            .where(SalesOrder.company_id == company_id)
            .order_by(SalesOrder.updated_at.desc(), SalesOrder.created_at.desc())
            .limit(min(max(limit, 1), 200))
        )

        return [
            self._build_monitoring_row(
                order=order,
                transaction=transaction,
                invoice=invoice,
            )
            for order, transaction, invoice in result.all()
        ]

    async def get_monitoring_item(
        self,
        *,
        order_id: UUID,
        company_id: UUID,
    ) -> dict | None:
        result = await self.db.execute(
            select(SalesOrder, FinanceTransaction, FinanceInvoice)
            .outerjoin(
                FinanceTransaction,
                FinanceTransaction.id == SalesOrder.transaction_id,
            )
            .outerjoin(
                FinanceInvoice,
                FinanceInvoice.id == SalesOrder.invoice_id,
            )
            .where(
                SalesOrder.id == order_id,
                SalesOrder.company_id == company_id,
            )
        )
        row = result.one_or_none()
        if row is None:
            return None

        order, transaction, invoice = row
        return self._build_monitoring_row(
            order=order,
            transaction=transaction,
            invoice=invoice,
        )

    async def confirm_payment(
        self,
        *,
        order_id: UUID,
        company_id: UUID,
        user_id: UUID,
    ) -> dict:
        order = await self._get_order(
            order_id=order_id,
            company_id=company_id,
            for_update=True,
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sales order not found",
            )

        if order.invoice_id is None or order.transaction_id is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Sales order has not generated a transaction and invoice",
            )

        invoice_result = await self.db.execute(
            select(FinanceInvoice)
            .where(
                FinanceInvoice.id == order.invoice_id,
                FinanceInvoice.company_id == company_id,
            )
            .with_for_update()
        )
        invoice = invoice_result.scalar_one_or_none()

        transaction_result = await self.db.execute(
            select(FinanceTransaction)
            .where(
                FinanceTransaction.id == order.transaction_id,
                FinanceTransaction.company_id == company_id,
            )
            .with_for_update()
        )
        transaction = transaction_result.scalar_one_or_none()

        if invoice is None or transaction is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Linked finance record was not found",
            )

        if transaction.cash_account_id is None:
            cash_account = await self._resolve_active_cash_account(
                company_id=company_id,
            )
            transaction.cash_account_id = cash_account.id

        now = utc_now_naive()
        invoice.paid_amount = money(invoice.total_amount)
        invoice.status = InvoiceStatus.PAID
        transaction.status = TransactionStatus.POSTED
        transaction.posted_at = transaction.posted_at or now
        order.updated_at = now

        await self._record_event(
            company_id=company_id,
            order_id=order.id,
            event_type="finance.payment.confirmed",
            payload={
                "order_id": str(order.id),
                "order_no": order.order_no,
                "invoice_id": str(invoice.id),
                "invoice_no": invoice.invoice_no,
                "transaction_id": str(transaction.id),
                "transaction_no": transaction.transaction_no,
                "paid_amount": str(invoice.paid_amount),
                "confirmed_by": str(user_id),
            },
        )

        await self.db.commit()
        monitoring = await self.get_monitoring_item(
            order_id=order.id,
            company_id=company_id,
        )
        assert monitoring is not None
        return monitoring

    async def _record_event(
        self,
        *,
        company_id: UUID,
        order_id: UUID,
        event_type: str,
        payload: dict,
    ) -> DomainEventOutbox:
        event_key = f"sales_order:{order_id}:{event_type}"
        existing_result = await self.db.execute(
            select(DomainEventOutbox).where(
                DomainEventOutbox.event_key == event_key
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing is not None:
            return existing

        event_payload = dict(payload)
        if "branch_id" not in event_payload:
            branch_id = await self.db.scalar(
                select(SalesOrder.branch_id).where(SalesOrder.id == order_id)
            )
            event_payload["branch_id"] = (
                str(branch_id) if branch_id is not None else None
            )

        event = DomainEventOutbox(
            company_id=company_id,
            aggregate_type="sales_order",
            aggregate_id=order_id,
            event_type=event_type,
            event_key=event_key,
            payload=event_payload,
            status=DomainEventStatus.PENDING,
            attempts=0,
            processed_at=None,
            next_attempt_at=None,
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def create_sales_order(
        self,
        *,
        payload: SalesOrderCreate,
        company_id: UUID,
        user_id: UUID,
    ) -> SalesOrder:
        product_ids = list(dict.fromkeys(item.product_id for item in payload.items))
        product_result = await self.db.execute(
            select(Product).where(
                Product.company_id == company_id,
                Product.id.in_(product_ids),
            )
        )
        products = {item.id: item for item in product_result.scalars().all()}

        if len(products) != len(product_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more products were not found",
            )

        incompatible_product = next(
            (
                product for product in products.values()
                if product.branch_id is not None
                and product.branch_id != payload.branch_id
            ),
            None,
        )
        if incompatible_product is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Product {incompatible_product.name} is not available "
                    "in selected branch"
                ),
            )

        order_no = payload.order_no or (
            f"SO-{payload.order_date:%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"
        )

        duplicate_result = await self.db.execute(
            select(SalesOrder.id).where(
                SalesOrder.company_id == company_id,
                SalesOrder.order_no == order_no,
            )
        )
        if duplicate_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Sales order number already exists",
            )

        order = SalesOrder(
            company_id=company_id,
            branch_id=payload.branch_id,
            order_no=order_no,
            customer_name=payload.customer_name.strip(),
            order_date=payload.order_date,
            due_date=payload.due_date,
            status=SalesOrderStatus.DRAFT,
            creation_mode=payload.creation_mode,
            auto_process=payload.auto_process,
            notes=payload.notes,
            created_by=user_id,
        )
        self.db.add(order)
        await self.db.flush()

        subtotal = Decimal("0.00")
        discount = Decimal("0.00")
        tax = Decimal("0.00")

        for item_payload in payload.items:
            product = products[item_payload.product_id]
            item_quantity = quantity(item_payload.quantity)
            unit_price = money(
                item_payload.unit_price
                if item_payload.unit_price is not None
                else product.selling_price
            )
            item_discount = money(item_payload.discount_amount)
            item_tax = money(item_payload.tax_amount)
            gross = money(item_quantity * unit_price)
            item_total = money(gross - item_discount + item_tax)

            if item_total < 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Sales order item total cannot be negative",
                )

            order_item = SalesOrderItem(
                sales_order=order,
                product_id=product.id,
                description=item_payload.description or product.name,
                quantity=item_quantity,
                unit_price=unit_price,
                discount_amount=item_discount,
                tax_amount=item_tax,
                total_amount=item_total,
            )
            self.db.add(order_item)

            subtotal += gross
            discount += item_discount
            tax += item_tax

        order.subtotal_amount = money(subtotal)
        order.discount_amount = money(discount)
        order.tax_amount = money(tax)
        order.total_amount = money(subtotal - discount + tax)

        if order.total_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Sales order total must be greater than zero",
            )

        # Persist item rows before the automation flow queries them.
        # Async SQLAlchemy must not rely on implicit relationship loading.
        await self.db.flush()

        await self._record_event(
            company_id=company_id,
            order_id=order.id,
            event_type="sales_order.created",
            payload={
                "order_id": str(order.id),
                "order_no": order.order_no,
                "customer_name": order.customer_name,
                "total_amount": str(order.total_amount),
                "creation_mode": order.creation_mode,
                "auto_process": order.auto_process,
            },
        )

        if payload.auto_process:
            await self._process_order(
                order=order,
                company_id=company_id,
                user_id=user_id,
            )

        await self.db.commit()
        return await self._get_order(
            order_id=order.id,
            company_id=company_id,
        )

    async def process_sales_order(
        self,
        *,
        order_id: UUID,
        company_id: UUID,
        user_id: UUID,
    ) -> SalesOrder:
        order = await self._get_order(
            order_id=order_id,
            company_id=company_id,
            for_update=True,
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sales order not found",
            )

        if (
            order.status == SalesOrderStatus.FULFILLED
            and order.transaction_id is not None
            and order.invoice_id is not None
        ):
            return order

        await self._process_order(
            order=order,
            company_id=company_id,
            user_id=user_id,
        )
        await self.db.commit()

        refreshed = await self._get_order(
            order_id=order.id,
            company_id=company_id,
        )
        assert refreshed is not None
        return refreshed

    async def _process_order(
        self,
        *,
        order: SalesOrder,
        company_id: UUID,
        user_id: UUID,
    ) -> None:
        if order.status == SalesOrderStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cancelled sales order cannot be processed",
            )

        order_items = await self._get_order_items(
            order_id=order.id,
        )

        if not order_items:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Sales order must contain at least one item",
            )

        # Aggregate repeated product lines so stock is validated and moved
        # exactly once per product using the total requested quantity.
        required_by_product: dict[UUID, Decimal] = {}
        for order_item in order_items:
            current = required_by_product.get(
                order_item.product_id,
                Decimal("0.0000"),
            )
            required_by_product[order_item.product_id] = quantity(
                current + Decimal(order_item.quantity)
            )

        product_ids = list(required_by_product)
        product_result = await self.db.execute(
            select(Product).where(
                Product.company_id == company_id,
                Product.id.in_(product_ids),
            )
        )
        products = {
            item.id: item
            for item in product_result.scalars().all()
        }

        stock_by_product: dict[UUID, ProductStock] = {}

        for product_id, required in required_by_product.items():
            product = products.get(product_id)

            if product is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Sales order product no longer exists",
                )

            if (
                product.branch_id is not None
                and product.branch_id != order.branch_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {product.name} is not available "
                        "in selected branch"
                    ),
                )

            if (
                not product.track_stock
                or product.product_type != ProductType.PHYSICAL
            ):
                continue

            stock_result = await self.db.execute(
                select(ProductStock)
                .where(
                    ProductStock.company_id == company_id,
                    ProductStock.branch_id == order.branch_id,
                    ProductStock.product_id == product.id,
                )
                .with_for_update()
            )
            stock = stock_result.scalar_one_or_none()

            if stock is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Stock is not configured for {product.name}",
                )

            available = (
                Decimal(stock.quantity_on_hand)
                - Decimal(stock.reserved_quantity)
            )

            if available < required:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Insufficient stock for {product.name}. "
                        f"Available {available}, required {required}"
                    ),
                )

            stock_by_product[product.id] = stock

        cash_account = await self._resolve_active_cash_account(
            company_id=company_id,
        )

        now = utc_now_naive()
        order.status = SalesOrderStatus.APPROVED
        order.approved_by = user_id
        order.approved_at = now

        await self._record_event(
            company_id=company_id,
            order_id=order.id,
            event_type="sales_order.approved",
            payload={
                "order_id": str(order.id),
                "approved_by": str(user_id),
            },
        )

        for product_id, required in required_by_product.items():
            product = products[product_id]
            stock = stock_by_product.get(product.id)

            if stock is None:
                continue

            movement_result = await self.db.execute(
                select(ProductStockMovement).where(
                    ProductStockMovement.company_id == company_id,
                    ProductStockMovement.source_module == "sales_order",
                    ProductStockMovement.source_id == order.id,
                    ProductStockMovement.product_id == product.id,
                    ProductStockMovement.branch_id == order.branch_id,
                )
            )
            existing_movement = movement_result.scalar_one_or_none()

            if existing_movement is not None:
                continue

            stock.reserved_quantity = (
                Decimal(stock.reserved_quantity) + required
            )
            stock.quantity_on_hand = (
                Decimal(stock.quantity_on_hand) - required
            )
            stock.reserved_quantity = (
                Decimal(stock.reserved_quantity) - required
            )

            movement = ProductStockMovement(
                company_id=company_id,
                branch_id=order.branch_id,
                product_id=product.id,
                created_by_id=user_id,
                movement_type=StockMovementType.SALES,
                quantity=required,
                unit_cost=money(product.cost_price),
                total_cost=money(
                    required * Decimal(product.cost_price)
                ),
                source_module="sales_order",
                source_id=order.id,
                notes=f"Automatic fulfillment for {order.order_no}",
            )
            self.db.add(movement)

        transaction_result = await self.db.execute(
            select(FinanceTransaction).where(
                FinanceTransaction.company_id == company_id,
                FinanceTransaction.source_module == "sales_order",
                FinanceTransaction.source_id == order.id,
            )
        )
        transaction = transaction_result.scalar_one_or_none()

        if transaction is None:
            transaction = FinanceTransaction(
                company_id=company_id,
                branch_id=order.branch_id,
                transaction_no=f"TRX-{order.order_no}",
                transaction_date=order.order_date,
                transaction_type=TransactionType.INCOME,
                cashflow_activity=CashflowActivity.OPERATING,
                cash_account_id=cash_account.id,
                status=TransactionStatus.POSTED,
                counterparty_name=order.customer_name,
                reference_no=order.order_no,
                source_module="sales_order",
                source_id=order.id,
                creation_mode="automatic",
                subtotal_amount=order.subtotal_amount,
                discount_amount=order.discount_amount,
                tax_amount=order.tax_amount,
                total_amount=order.total_amount,
                description=f"Automatic sales transaction from {order.order_no}",
                posted_at=now,
                created_by=user_id,
            )
            self.db.add(transaction)
            await self.db.flush()
        elif transaction.cash_account_id is None:
            # Backward compatibility for orders created before cash-account
            # enforcement was introduced.
            transaction.cash_account_id = cash_account.id

        invoice_result = await self.db.execute(
            select(FinanceInvoice).where(
                FinanceInvoice.company_id == company_id,
                FinanceInvoice.source_module == "sales_order",
                FinanceInvoice.source_id == order.id,
            )
        )
        invoice = invoice_result.scalar_one_or_none()

        if invoice is None:
            invoice = FinanceInvoice(
                company_id=company_id,
                branch_id=order.branch_id,
                invoice_no=f"INV-{order.order_no}",
                client_name=order.customer_name,
                invoice_date=order.order_date,
                due_date=order.due_date,
                subtotal_amount=order.subtotal_amount,
                tax_amount=order.tax_amount,
                total_amount=order.total_amount,
                paid_amount=Decimal("0.00"),
                status=InvoiceStatus.SENT,
                source_module="sales_order",
                source_id=order.id,
                creation_mode="automatic",
                notes=f"Generated automatically from {order.order_no}",
            )
            self.db.add(invoice)
            await self.db.flush()

        order.transaction_id = transaction.id
        order.invoice_id = invoice.id
        order.status = SalesOrderStatus.FULFILLED
        order.fulfilled_at = now

        await self._record_event(
            company_id=company_id,
            order_id=order.id,
            event_type="inventory.stock_fulfilled",
            payload={
                "order_id": str(order.id),
                "branch_id": str(order.branch_id),
                "item_count": len(order_items),
            },
        )
        await self._record_event(
            company_id=company_id,
            order_id=order.id,
            event_type="finance.transaction.created",
            payload={
                "order_id": str(order.id),
                "transaction_id": str(transaction.id),
                "transaction_no": transaction.transaction_no,
                "cash_account_id": str(cash_account.id),
                "cash_account_name": cash_account.name,
                "total_amount": str(transaction.total_amount),
            },
        )
        await self._record_event(
            company_id=company_id,
            order_id=order.id,
            event_type="finance.invoice.created",
            payload={
                "order_id": str(order.id),
                "invoice_id": str(invoice.id),
                "invoice_no": invoice.invoice_no,
                "total_amount": str(invoice.total_amount),
            },
        )
        await self._record_event(
            company_id=company_id,
            order_id=order.id,
            event_type="sales_order.fulfilled",
            payload={
                "order_id": str(order.id),
                "transaction_id": str(transaction.id),
                "invoice_id": str(invoice.id),
            },
        )

        await self.db.flush()
