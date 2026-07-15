from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.time import utc_now_naive
from src.service.base_domain_service import BaseDomainService
from src.modules.crm.model_crm import (
    CRMActivity,
    CRMContact,
    CRMDeal,
    CRMDealItem,
    CRMLead,
    DealStage,
    LeadStatus,
)
from src.modules.finance.model_finance import (
    CashflowActivity,
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
        deal = await self.recalculate_deal_value(deal_id)

        if deal is None:
            return None

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
            subtotal_amount=deal.expected_value,
            total_amount=deal.expected_value,
            description=f"Sales closing from CRM deal: {deal.title}",
        )

        self.db.add(transaction)
        await self.db.flush()

        deal.stage = DealStage.WON
        deal.closed_at = utc_now_naive()
        deal.finance_transaction_id = transaction.id

        await self.db.commit()
        await self.db.refresh(deal)
        await self._publish_change("won", deal)

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