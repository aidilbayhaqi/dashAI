from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select

from src.core.time import utc_now_naive
from src.service.base_domain_service import BaseDomainService
from src.service.domain_integrity import commit_or_raise
from src.modules.crm.model_crm import (
    CRMActivity,
    CRMContact,
    CRMDeal,
    CRMDealItem,
    CRMLead,
    DealStage,
    LeadStatus,
)
from src.modules.finance.service_accounting_bridge import AccountingBridgeService
from src.modules.finance.service_finance_automation import (
    ensure_invoice_tax_record,
    record_domain_event,
)
from src.modules.finance.model_finance import (
    CashflowActivity,
    FinanceCashAccount,
    FinanceInvoice,
    FinanceTransaction,
    InvoiceStatus,
    TransactionStatus,
    TransactionType,
)


class CRMLeadService(BaseDomainService):
    model_class = CRMLead

    async def get_followup_due(self, company_id: UUID, until_date: datetime):
        result = await self.db.execute(
            select(CRMLead)
            .where(
                CRMLead.company_id == company_id,
                CRMLead.next_follow_up_at <= until_date,
                CRMLead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED]),
            )
            .order_by(CRMLead.next_follow_up_at.asc())
        )
        return list(result.scalars().all())


class CRMContactService(BaseDomainService):
    model_class = CRMContact


class CRMDealService(BaseDomainService):
    model_class = CRMDeal

    async def recalculate_deal_value(self, deal_id: UUID):
        deal = await self.get_by_id(deal_id)
        if deal is None:
            return None

        result = await self.db.execute(
            select(func.coalesce(func.sum(CRMDealItem.total_amount), 0)).where(
                CRMDealItem.deal_id == deal_id
            )
        )
        deal.expected_value = Decimal(str(result.scalar_one()))
        await self.db.commit()
        await self.db.refresh(deal)
        await self._publish_change("recalculated", deal)
        return deal

    async def _deal_totals(self, deal_id: UUID) -> tuple[Decimal, Decimal, Decimal]:
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(CRMDealItem.total_amount), 0),
                func.coalesce(func.sum(CRMDealItem.tax_amount), 0),
            ).where(CRMDealItem.deal_id == deal_id)
        )
        total_raw, tax_raw = result.one()
        total = Decimal(str(total_raw or 0)).quantize(Decimal("0.01"))
        tax = Decimal(str(tax_raw or 0)).quantize(Decimal("0.01"))
        subtotal = max(total - tax, Decimal("0.00"))
        return subtotal, tax, total

    async def close_won(self, deal_id: UUID):
        locked_result = await self.db.execute(
            select(CRMDeal).where(CRMDeal.id == deal_id).with_for_update()
        )
        deal = locked_result.scalar_one_or_none()
        if deal is None:
            return None

        if (
            deal.stage == DealStage.WON
            and deal.finance_transaction_id is not None
            and deal.invoice_id is not None
        ):
            return deal

        subtotal, tax_amount, total = await self._deal_totals(deal.id)
        if total <= 0:
            total = Decimal(deal.expected_value or 0).quantize(Decimal("0.01"))
            subtotal = total
            tax_amount = Decimal("0.00")
        if total <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Won deal value must be greater than zero",
            )
        deal.expected_value = total

        transaction_result = await self.db.execute(
            select(FinanceTransaction).where(
                FinanceTransaction.company_id == deal.company_id,
                FinanceTransaction.source_module == "crm_deal",
                FinanceTransaction.source_id == deal.id,
            )
        )
        transaction = transaction_result.scalar_one_or_none()
        if transaction is None:
            transaction = FinanceTransaction(
                company_id=deal.company_id,
                branch_id=deal.branch_id,
                transaction_no=f"CRM-DEAL-{str(deal.id)[:8].upper()}",
                transaction_date=date.today(),
                transaction_type=TransactionType.INCOME,
                cashflow_activity=CashflowActivity.OPERATING,
                status=TransactionStatus.DRAFT,
                source_module="crm_deal",
                source_id=deal.id,
                creation_mode="automatic",
                subtotal_amount=subtotal,
                tax_amount=tax_amount,
                total_amount=total,
                counterparty_name=deal.title,
                description=f"CRM won deal receivable: {deal.title}",
            )
            self.db.add(transaction)
            await self.db.flush()

        invoice_result = await self.db.execute(
            select(FinanceInvoice).where(
                FinanceInvoice.company_id == deal.company_id,
                FinanceInvoice.source_module == "crm_deal",
                FinanceInvoice.source_id == deal.id,
            )
        )
        invoice = invoice_result.scalar_one_or_none()
        if invoice is None:
            invoice = FinanceInvoice(
                company_id=deal.company_id,
                branch_id=deal.branch_id,
                invoice_no=f"CRM-INV-{str(deal.id)[:8].upper()}",
                client_name=deal.title,
                invoice_date=date.today(),
                due_date=deal.expected_close_date,
                subtotal_amount=subtotal,
                tax_amount=tax_amount,
                total_amount=total,
                paid_amount=Decimal("0.00"),
                status=InvoiceStatus.SENT,
                source_module="crm_deal",
                source_id=deal.id,
                creation_mode="automatic",
                notes=f"Generated from CRM deal {deal.title}",
            )
            self.db.add(invoice)
            await self.db.flush()

        await ensure_invoice_tax_record(self.db, invoice=invoice)
        await AccountingBridgeService(self.db).ensure_invoice_issue_journal(
            invoice=invoice,
            transaction_id=transaction.id,
            created_by=deal.owner_user_id,
        )

        deal.stage = DealStage.WON
        deal.closed_at = utc_now_naive()
        deal.finance_transaction_id = transaction.id
        deal.invoice_id = invoice.id

        await record_domain_event(
            self.db,
            company_id=deal.company_id,
            aggregate_type="crm_deal",
            aggregate_id=deal.id,
            event_type="crm.deal.won",
            event_key=f"crm-deal:{deal.id}:won",
            payload={
                "deal_id": str(deal.id),
                "transaction_id": str(transaction.id),
                "invoice_id": str(invoice.id),
                "expected_value": str(deal.expected_value),
            },
        )
        await commit_or_raise(self.db)
        await self.db.refresh(deal)
        await self._publish_change("won", deal)
        return deal

    async def confirm_payment(
        self,
        *,
        deal_id: UUID,
        cash_account_id: UUID | None,
        payment_date: date | None = None,
        reference_no: str | None = None,
        notes: str | None = None,
    ):
        locked_result = await self.db.execute(
            select(CRMDeal).where(CRMDeal.id == deal_id).with_for_update()
        )
        deal = locked_result.scalar_one_or_none()
        if deal is None:
            return None
        if (
            deal.stage != DealStage.WON
            or deal.finance_transaction_id is None
            or deal.invoice_id is None
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only a won deal with an invoice can be settled",
            )

        transaction_result = await self.db.execute(
            select(FinanceTransaction)
            .where(
                FinanceTransaction.id == deal.finance_transaction_id,
                FinanceTransaction.company_id == deal.company_id,
            )
            .with_for_update()
        )
        transaction = transaction_result.scalar_one_or_none()
        invoice_result = await self.db.execute(
            select(FinanceInvoice)
            .where(
                FinanceInvoice.id == deal.invoice_id,
                FinanceInvoice.company_id == deal.company_id,
            )
            .with_for_update()
        )
        invoice = invoice_result.scalar_one_or_none()
        if transaction is None or invoice is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Linked Finance records were not found",
            )
        if (
            transaction.status == TransactionStatus.POSTED
            and invoice.status == InvoiceStatus.PAID
        ):
            return deal
        if transaction.status != TransactionStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only a draft deal transaction can be settled",
            )

        cash_query = select(FinanceCashAccount).where(
            FinanceCashAccount.company_id == deal.company_id,
            FinanceCashAccount.is_active.is_(True),
        )
        if cash_account_id is not None:
            cash_query = cash_query.where(FinanceCashAccount.id == cash_account_id)
        else:
            cash_query = cash_query.order_by(
                FinanceCashAccount.is_default.desc(),
                FinanceCashAccount.created_at.asc(),
                FinanceCashAccount.id.asc(),
            ).limit(1)
        cash_result = await self.db.execute(cash_query.with_for_update())
        cash_account = cash_result.scalar_one_or_none()
        if cash_account is None:
            raise HTTPException(status_code=404, detail="Cash account not found")

        amount = Decimal(transaction.total_amount or 0)
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Deal value must be greater than zero",
            )
        cash_account.current_balance = Decimal(cash_account.current_balance) + amount
        transaction.cash_account_id = cash_account.id
        transaction.transaction_date = payment_date or date.today()
        transaction.reference_no = reference_no or transaction.reference_no
        transaction.description = notes or transaction.description
        transaction.status = TransactionStatus.POSTED
        transaction.posted_at = utc_now_naive()
        invoice.paid_amount = Decimal(invoice.total_amount)
        invoice.status = InvoiceStatus.PAID

        bridge = AccountingBridgeService(self.db)
        await bridge.ensure_invoice_issue_journal(
            invoice=invoice,
            transaction_id=transaction.id,
            created_by=deal.owner_user_id,
        )
        await bridge.ensure_invoice_payment_journal(
            invoice=invoice,
            transaction=transaction,
            cash_account=cash_account,
            amount=amount,
        )
        await record_domain_event(
            self.db,
            company_id=deal.company_id,
            aggregate_type="crm_deal",
            aggregate_id=deal.id,
            event_type="crm.deal.payment_confirmed",
            event_key=f"crm-deal:{deal.id}:payment-confirmed",
            payload={
                "deal_id": str(deal.id),
                "transaction_id": str(transaction.id),
                "invoice_id": str(invoice.id),
                "cash_account_id": str(cash_account.id),
                "amount": str(amount),
            },
        )
        await commit_or_raise(self.db)
        await self.db.refresh(deal)
        await self._publish_change("payment_confirmed", deal)
        return deal

    async def close_lost(self, deal_id: UUID, reason: str | None = None):
        deal = await self.get_by_id(deal_id)
        if deal is None:
            return None
        if deal.stage == DealStage.WON and (
            deal.finance_transaction_id is not None or deal.invoice_id is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A won deal with Finance records cannot be closed as lost",
            )

        deal.stage = DealStage.LOST
        deal.closed_at = utc_now_naive()
        deal.won_lost_reason = reason
        await self.db.commit()
        await self.db.refresh(deal)
        await self._publish_change("lost", deal)
        return deal


class CRMDealItemService(BaseDomainService):
    model_class = CRMDealItem

    async def create_item(self, payload):
        amount = payload.quantity * payload.unit_price
        total_amount = amount - payload.discount_amount + payload.tax_amount

        item = CRMDealItem(
            **payload.model_dump(),
            total_amount=total_amount,
        )

        deal = await self.db.get(CRMDeal, payload.deal_id)
        if deal is None:
            return None

        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        await self._publish_change(
            "created",
            item,
            company_id=deal.company_id,
        )

        return item


class CRMActivityService(BaseDomainService):
    model_class = CRMActivity