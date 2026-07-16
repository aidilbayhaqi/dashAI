from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
from src.modules.finance.service_finance_automation import record_domain_event
from src.modules.finance.model_finance import (
    CashflowActivity,
    FinanceCashAccount,
    FinanceTransaction,
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
            select(func.coalesce(func.sum(CRMDealItem.total_amount), 0))
            .where(CRMDealItem.deal_id == deal_id)
        )

        deal.expected_value = Decimal(str(result.scalar_one()))

        await self.db.commit()
        await self.db.refresh(deal)
        await self._publish_change("recalculated", deal)

        return deal

    async def close_won(self, deal_id: UUID):
        locked_result = await self.db.execute(
            select(CRMDeal).where(CRMDeal.id == deal_id).with_for_update()
        )
        deal = locked_result.scalar_one_or_none()
        if deal is None:
            return None

        if deal.stage == DealStage.WON and deal.finance_transaction_id is not None:
            return deal

        value_result = await self.db.execute(
            select(func.coalesce(func.sum(CRMDealItem.total_amount), 0)).where(
                CRMDealItem.deal_id == deal_id
            )
        )
        deal.expected_value = Decimal(str(value_result.scalar_one()))

        existing_result = await self.db.execute(
            select(FinanceTransaction).where(
                FinanceTransaction.company_id == deal.company_id,
                FinanceTransaction.source_module == "crm_deal",
                FinanceTransaction.source_id == deal.id,
            )
        )
        transaction = existing_result.scalar_one_or_none()
        if transaction is None:
            transaction = FinanceTransaction(
                company_id=deal.company_id,
                branch_id=deal.branch_id,
                transaction_no=f"CRM-DEAL-{str(deal.id)[:8]}",
                transaction_date=date.today(),
                transaction_type=TransactionType.INCOME,
                cashflow_activity=CashflowActivity.OPERATING,
                status=TransactionStatus.DRAFT,
                source_module="crm_deal",
                source_id=deal.id,
                creation_mode="automatic",
                subtotal_amount=deal.expected_value,
                total_amount=deal.expected_value,
                description=f"CRM won deal receivable: {deal.title}",
            )
            self.db.add(transaction)
            await self.db.flush()

        deal.stage = DealStage.WON
        deal.closed_at = utc_now_naive()
        deal.finance_transaction_id = transaction.id

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
        if deal.stage != DealStage.WON or deal.finance_transaction_id is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only a won deal with a finance transaction can be settled",
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
        if transaction is None:
            raise HTTPException(status_code=409, detail="Linked finance transaction not found")
        if transaction.status == TransactionStatus.POSTED:
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
            cash_query = cash_query.where(
                FinanceCashAccount.id == cash_account_id,
            )
        else:
            cash_query = cash_query.order_by(
                FinanceCashAccount.created_at.asc(),
                FinanceCashAccount.id.asc(),
            ).limit(1)
        cash_result = await self.db.execute(
            cash_query.with_for_update()
        )
        cash_account = cash_result.scalar_one_or_none()
        if cash_account is None:
            raise HTTPException(status_code=404, detail="Cash account not found")

        amount = Decimal(transaction.total_amount or 0)
        if amount <= 0:
            raise HTTPException(status_code=409, detail="Deal value must be greater than zero")
        cash_account.current_balance = Decimal(cash_account.current_balance) + amount
        transaction.cash_account_id = cash_account.id
        transaction.transaction_date = payment_date or date.today()
        transaction.reference_no = reference_no or transaction.reference_no
        transaction.description = notes or transaction.description
        transaction.status = TransactionStatus.POSTED
        transaction.posted_at = utc_now_naive()

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