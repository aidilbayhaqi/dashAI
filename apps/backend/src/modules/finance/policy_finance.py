from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.finance.model_finance import (
    BudgetStatus,
    FinanceBudget,
    FinanceCashAccount,
    FinanceInvoice,
    FinanceJournalEntry,
    FinanceTransaction,
    InvoiceStatus,
    JournalStatus,
    TaxRecordStatus,
    TransactionStatus,
)
from src.security.dependencies import CurrentUser
from src.service.write_policy import CRUDWritePolicy


ZERO = Decimal("0")


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=detail,
    )


def _reject_fields(data: dict[str, Any], fields: set[str]) -> None:
    attempted = sorted(field for field in fields if field in data)
    if attempted:
        raise _unprocessable(
            "Protected fields must be changed through a finance command: "
            + ", ".join(attempted)
        )


def _validate_transaction_amounts(values: dict[str, Any]) -> None:
    amount_fields = (
        "subtotal_amount",
        "discount_amount",
        "tax_amount",
        "total_amount",
    )
    amounts = {
        field: Decimal(str(values.get(field, ZERO) or ZERO))
        for field in amount_fields
    }
    if any(value < ZERO for value in amounts.values()):
        raise _unprocessable("Transaction amounts cannot be negative")
    if amounts["total_amount"] <= ZERO:
        raise _unprocessable("Transaction total amount must be greater than zero")


def _validate_invoice_amounts(values: dict[str, Any]) -> None:
    subtotal = Decimal(str(values.get("subtotal_amount", ZERO) or ZERO))
    tax = Decimal(str(values.get("tax_amount", ZERO) or ZERO))
    total = Decimal(str(values.get("total_amount", ZERO) or ZERO))
    paid = Decimal(str(values.get("paid_amount", ZERO) or ZERO))
    if min(subtotal, tax, total, paid) < ZERO:
        raise _unprocessable("Invoice amounts cannot be negative")
    if total <= ZERO:
        raise _unprocessable("Invoice total amount must be greater than zero")
    if paid > total:
        raise _unprocessable("Invoice paid amount cannot exceed total amount")


class FinanceTransactionWritePolicy(CRUDWritePolicy):
    protected_update_fields = {
        "status",
        "posted_at",
        "source_module",
        "source_id",
        "creation_mode",
        "created_by",
    }

    async def before_create(
        self,
        *,
        db: AsyncSession,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db
        data = dict(data)
        data["status"] = TransactionStatus.DRAFT
        data["posted_at"] = None
        data["created_by"] = current_user.user_id
        data["source_module"] = None
        data["source_id"] = None
        data["creation_mode"] = "manual"
        _validate_transaction_amounts(data)
        return data

    async def before_update(
        self,
        *,
        db: AsyncSession,
        existing: FinanceTransaction,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db, current_user
        if existing.status != TransactionStatus.DRAFT:
            raise _conflict("Only draft transactions can be edited")
        _reject_fields(data, self.protected_update_fields)
        merged = {
            "subtotal_amount": existing.subtotal_amount,
            "discount_amount": existing.discount_amount,
            "tax_amount": existing.tax_amount,
            "total_amount": existing.total_amount,
            **data,
        }
        _validate_transaction_amounts(merged)
        return data

    async def before_delete(
        self,
        *,
        db: AsyncSession,
        existing: FinanceTransaction,
        current_user: CurrentUser,
    ) -> None:
        del db, current_user
        if existing.status != TransactionStatus.DRAFT:
            raise _conflict("Posted/void transactions cannot be deleted")
        if existing.source_module:
            raise _conflict("Automatically generated transactions cannot be deleted")


class FinanceInvoiceWritePolicy(CRUDWritePolicy):
    protected_update_fields = {
        "status",
        "paid_amount",
        "source_module",
        "source_id",
        "creation_mode",
    }

    async def before_create(
        self,
        *,
        db: AsyncSession,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db
        data = dict(data)
        data["status"] = InvoiceStatus.DRAFT
        data["paid_amount"] = ZERO
        data["source_module"] = None
        data["source_id"] = None
        data["creation_mode"] = "manual"
        _validate_invoice_amounts(data)
        invoice_date = data.get("invoice_date")
        due_date = data.get("due_date")
        if invoice_date and due_date and due_date < invoice_date:
            raise _unprocessable("Invoice due date cannot precede invoice date")
        return data

    async def before_update(
        self,
        *,
        db: AsyncSession,
        existing: FinanceInvoice,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db, current_user
        if existing.status not in {InvoiceStatus.DRAFT, InvoiceStatus.SENT}:
            raise _conflict("Paid/cancelled invoices cannot be edited")
        _reject_fields(data, self.protected_update_fields)
        if existing.status == InvoiceStatus.SENT:
            allowed_sent_fields = {"due_date", "attachment_url", "notes"}
            disallowed = sorted(set(data) - allowed_sent_fields)
            if disallowed:
                raise _conflict(
                    "Sent invoice financial and identity fields are locked: "
                    + ", ".join(disallowed)
                )
        merged = {
            "subtotal_amount": existing.subtotal_amount,
            "tax_amount": existing.tax_amount,
            "total_amount": existing.total_amount,
            "paid_amount": existing.paid_amount,
            "invoice_date": existing.invoice_date,
            "due_date": existing.due_date,
            **data,
        }
        _validate_invoice_amounts(merged)
        if (
            merged.get("invoice_date")
            and merged.get("due_date")
            and merged["due_date"] < merged["invoice_date"]
        ):
            raise _unprocessable("Invoice due date cannot precede invoice date")
        return data

    async def before_delete(
        self,
        *,
        db: AsyncSession,
        existing: FinanceInvoice,
        current_user: CurrentUser,
    ) -> None:
        del db, current_user
        if existing.status != InvoiceStatus.DRAFT:
            raise _conflict("Only draft invoices can be deleted")
        if existing.source_module:
            raise _conflict("Automatically generated invoices cannot be deleted")


class FinanceJournalWritePolicy(CRUDWritePolicy):
    protected_update_fields = {
        "status",
        "posted_at",
        "created_by",
        "total_debit",
        "total_credit",
        "is_balanced",
    }

    async def before_create(
        self,
        *,
        db: AsyncSession,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db
        data = dict(data)
        data.update(
            status=JournalStatus.DRAFT,
            posted_at=None,
            created_by=current_user.user_id,
            total_debit=ZERO,
            total_credit=ZERO,
            is_balanced=False,
        )
        return data

    async def before_update(
        self,
        *,
        db: AsyncSession,
        existing: FinanceJournalEntry,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db, current_user
        if existing.status != JournalStatus.DRAFT:
            raise _conflict("Only draft journals can be edited")
        _reject_fields(data, self.protected_update_fields)
        return data

    async def before_delete(
        self,
        *,
        db: AsyncSession,
        existing: FinanceJournalEntry,
        current_user: CurrentUser,
    ) -> None:
        del db, current_user
        if existing.status != JournalStatus.DRAFT:
            raise _conflict("Posted/reversed journals cannot be deleted")


class FinanceCashAccountWritePolicy(CRUDWritePolicy):
    @staticmethod
    async def _clear_other_defaults(
        *,
        db: AsyncSession,
        company_id: Any,
        exclude_id: Any | None = None,
    ) -> None:
        statement = update(FinanceCashAccount).where(
            FinanceCashAccount.company_id == company_id,
            FinanceCashAccount.is_default.is_(True),
        )
        if exclude_id is not None:
            statement = statement.where(FinanceCashAccount.id != exclude_id)
        await db.execute(statement.values(is_default=False))

    async def before_create(
        self,
        *,
        db: AsyncSession,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del current_user
        data = dict(data)
        opening = Decimal(str(data.get("opening_balance", ZERO) or ZERO))
        data["current_balance"] = opening
        if data.get("is_default"):
            await self._clear_other_defaults(
                db=db,
                company_id=data.get("company_id"),
            )
        return data

    async def before_update(
        self,
        *,
        db: AsyncSession,
        existing: FinanceCashAccount,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del current_user
        _reject_fields(data, {"opening_balance", "current_balance"})
        if data.get("is_default"):
            await self._clear_other_defaults(
                db=db,
                company_id=existing.company_id,
                exclude_id=existing.id,
            )
        return data


class FinanceTransactionLineWritePolicy(CRUDWritePolicy):
    async def _parent(
        self,
        db: AsyncSession,
        transaction_id: Any,
    ) -> FinanceTransaction:
        result = await db.execute(
            select(FinanceTransaction).where(
                FinanceTransaction.id == transaction_id
            )
        )
        parent = result.scalar_one_or_none()
        if parent is None:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if parent.status != TransactionStatus.DRAFT:
            raise _conflict("Transaction lines are locked after posting")
        return parent

    async def before_create(self, *, db, data, current_user):
        del current_user
        await self._parent(db, data.get("transaction_id"))
        return data

    async def before_update(self, *, db, existing, data, current_user):
        del current_user
        await self._parent(db, existing.transaction_id)
        return data

    async def before_delete(self, *, db, existing, current_user):
        del current_user
        await self._parent(db, existing.transaction_id)


class FinanceJournalLineWritePolicy(CRUDWritePolicy):
    async def _parent(
        self,
        db: AsyncSession,
        journal_entry_id: Any,
    ) -> FinanceJournalEntry:
        result = await db.execute(
            select(FinanceJournalEntry).where(
                FinanceJournalEntry.id == journal_entry_id
            )
        )
        parent = result.scalar_one_or_none()
        if parent is None:
            raise HTTPException(status_code=404, detail="Journal not found")
        if parent.status != JournalStatus.DRAFT:
            raise _conflict("Journal lines are locked after posting")
        return parent

    async def before_create(self, *, db, data, current_user):
        del current_user
        await self._parent(db, data.get("journal_entry_id"))
        return data

    async def before_update(self, *, db, existing, data, current_user):
        del current_user
        await self._parent(db, existing.journal_entry_id)
        return data

    async def before_delete(self, *, db, existing, current_user):
        del current_user
        await self._parent(db, existing.journal_entry_id)


class FinanceTaxRecordWritePolicy(CRUDWritePolicy):
    protected_update_fields = {
        "status",
        "paid_amount",
        "paid_date",
        "reported_date",
    }

    @staticmethod
    def _validate(values: dict[str, Any]) -> None:
        taxable = Decimal(str(values.get("taxable_amount", ZERO) or ZERO))
        tax = Decimal(str(values.get("tax_amount", ZERO) or ZERO))
        paid = Decimal(str(values.get("paid_amount", ZERO) or ZERO))
        if min(taxable, tax, paid) < ZERO:
            raise _unprocessable("Tax amounts cannot be negative")
        if tax <= ZERO:
            raise _unprocessable("Tax amount must be greater than zero")
        if paid > tax:
            raise _unprocessable("Paid tax amount cannot exceed tax amount")

    async def before_create(self, *, db, data, current_user):
        del db, current_user
        data = dict(data)
        data.update(
            status=TaxRecordStatus.DRAFT,
            paid_amount=ZERO,
            paid_date=None,
            reported_date=None,
        )
        self._validate(data)
        return data

    async def before_update(self, *, db, existing, data, current_user):
        del db, current_user
        if existing.status not in {TaxRecordStatus.DRAFT, TaxRecordStatus.ACCRUED}:
            raise _conflict("Paid, reported, or cancelled tax records are locked")
        _reject_fields(data, self.protected_update_fields)
        if existing.status == TaxRecordStatus.ACCRUED:
            allowed = {"due_date", "reference_no", "notes"}
            disallowed = sorted(set(data) - allowed)
            if disallowed:
                raise _conflict(
                    "Accrued tax financial fields are locked: " + ", ".join(disallowed)
                )
        merged = {
            "taxable_amount": existing.taxable_amount,
            "tax_amount": existing.tax_amount,
            "paid_amount": existing.paid_amount,
            **data,
        }
        self._validate(merged)
        return data

    async def before_delete(self, *, db, existing, current_user):
        del db, current_user
        if existing.status != TaxRecordStatus.DRAFT:
            raise _conflict("Only draft tax records can be deleted")


class FinanceBudgetWritePolicy(CRUDWritePolicy):
    async def before_create(self, *, db, data, current_user):
        del db, current_user
        data = dict(data)
        data["status"] = BudgetStatus.DRAFT
        data["total_budget_amount"] = ZERO
        return data

    async def before_update(self, *, db, existing, data, current_user):
        del db, current_user
        if existing.status != BudgetStatus.DRAFT:
            raise _conflict("Only draft budgets can be edited")
        _reject_fields(data, {"status", "total_budget_amount"})
        return data

    async def before_delete(self, *, db, existing, current_user):
        del db, current_user
        if existing.status != BudgetStatus.DRAFT:
            raise _conflict("Only draft budgets can be deleted")


class FinanceBudgetLineWritePolicy(CRUDWritePolicy):
    async def _parent(self, db: AsyncSession, budget_id: Any) -> FinanceBudget:
        result = await db.execute(
            select(FinanceBudget).where(FinanceBudget.id == budget_id)
        )
        budget = result.scalar_one_or_none()
        if budget is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        if budget.status != BudgetStatus.DRAFT:
            raise _conflict("Budget lines are locked when budget is not draft")
        return budget

    async def before_create(self, *, db, data, current_user):
        del current_user
        await self._parent(db, data.get("budget_id"))
        data = dict(data)
        amount = Decimal(str(data.get("budget_amount", ZERO) or ZERO))
        if amount < ZERO:
            raise _unprocessable("Budget amount cannot be negative")
        data.update(actual_amount=ZERO, variance_amount=ZERO, variance_percent=ZERO)
        return data

    async def before_update(self, *, db, existing, data, current_user):
        del current_user
        await self._parent(db, existing.budget_id)
        _reject_fields(data, {"actual_amount", "variance_amount", "variance_percent"})
        if "budget_amount" in data and Decimal(str(data["budget_amount"])) < ZERO:
            raise _unprocessable("Budget amount cannot be negative")
        return data

    async def before_delete(self, *, db, existing, current_user):
        del current_user
        await self._parent(db, existing.budget_id)


class ImmutableFinanceSnapshotWritePolicy(CRUDWritePolicy):
    async def before_create(self, *, db, data, current_user):
        del db, data, current_user
        raise _conflict("Finance snapshots must be generated through report commands")

    async def before_update(self, *, db, existing, data, current_user):
        del db, existing, data, current_user
        raise _conflict("Generated finance snapshots are immutable")

    async def before_delete(self, *, db, existing, current_user):
        del db, existing, current_user
        raise _conflict("Generated finance snapshots cannot be deleted")
