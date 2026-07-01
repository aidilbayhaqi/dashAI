from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.crm.model_crm import (
    CRMActivity,
    CRMActivityStatus,
    CRMActivityType,
    CRMContact,
    CRMDeal,
    CRMDealItem,
    CRMLead,
    DealStage,
    LeadStatus,
)
from src.seeds.context import CompanySeedContext
from src.seeds.utils import D, add_many_if_missing, sid


async def seed_crm(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
):
    for ctx in contexts.values():
        leads = [
            CRMLead(
                id=ctx.lead_ids["lead-001"],
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                owner_user_id=ctx.user_ids["sales"],
                name="Andi Pratama",
                company_name="PT Sinar Retail Indonesia",
                email=f"andi@lead-{ctx.code}.test",
                phone="+62-811-2000-0001",
                source="website",
                status=LeadStatus.NEW,
                score=72,
                estimated_value=D("35000000"),
                next_follow_up_at=datetime(2026, 6, 27, 10, 0),
                notes="Sample lead dari website",
            ),
            CRMLead(
                id=ctx.lead_ids["lead-002"],
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                owner_user_id=ctx.user_ids["sales"],
                name="Rina Kurnia",
                company_name="CV Maju Logistik",
                email=f"rina@lead-{ctx.code}.test",
                phone="+62-811-2000-0002",
                source="referral",
                status=LeadStatus.QUALIFIED,
                score=85,
                estimated_value=D("52000000"),
                next_follow_up_at=datetime(2026, 6, 28, 10, 0),
                notes="Sample qualified lead",
            ),
        ]

        await add_many_if_missing(db, leads)
        await db.flush()

        contacts = [
            CRMContact(
                id=ctx.contact_ids["contact-001"],
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=ctx.lead_ids["lead-001"],
                owner_user_id=ctx.user_ids["sales"],
                name="Andi Pratama",
                company_name="PT Sinar Retail Indonesia",
                position="Procurement Manager",
                email=f"andi@contact-{ctx.code}.test",
                phone="+62-811-3000-0001",
            ),
            CRMContact(
                id=ctx.contact_ids["contact-002"],
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=ctx.lead_ids["lead-002"],
                owner_user_id=ctx.user_ids["sales"],
                name="Rina Kurnia",
                company_name="CV Maju Logistik",
                position="Director",
                email=f"rina@contact-{ctx.code}.test",
                phone="+62-811-3000-0002",
            ),
        ]

        await add_many_if_missing(db, contacts)
        await db.flush()

        deals = [
            CRMDeal(
                id=ctx.deal_ids["deal-001"],
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=ctx.lead_ids["lead-001"],
                contact_id=ctx.contact_ids["contact-001"],
                owner_user_id=ctx.user_ids["sales"],
                title="Implementasi ERP Paket Pro",
                stage=DealStage.PROPOSAL,
                expected_value=D("35000000"),
                probability_percent=D("65.0000"),
                expected_close_date=date(2026, 7, 15),
                closed_at=None,
                won_lost_reason=None,
                finance_transaction_id=None,
            ),
            CRMDeal(
                id=ctx.deal_ids["deal-002"],
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=ctx.lead_ids["lead-002"],
                contact_id=ctx.contact_ids["contact-002"],
                owner_user_id=ctx.user_ids["sales"],
                title="Implementasi ERP Enterprise",
                stage=DealStage.NEGOTIATION,
                expected_value=D("52000000"),
                probability_percent=D("75.0000"),
                expected_close_date=date(2026, 7, 30),
                closed_at=None,
                won_lost_reason=None,
                finance_transaction_id=None,
            ),
        ]

        await add_many_if_missing(db, deals)
        await db.flush()

        deal_items = [
            CRMDealItem(
                id=sid(f"crm-deal-item:{ctx.code}:deal-001:1"),
                deal_id=ctx.deal_ids["deal-001"],
                product_id=ctx.product_ids["prd-001"],
                description="ERP Pro License",
                quantity=D("1"),
                unit_price=D("2500000"),
                discount_amount=D("0"),
                tax_amount=D("275000"),
                total_amount=D("2775000"),
            ),
            CRMDealItem(
                id=sid(f"crm-deal-item:{ctx.code}:deal-002:1"),
                deal_id=ctx.deal_ids["deal-002"],
                product_id=ctx.product_ids["prd-002"],
                description="Implementation Service",
                quantity=D("1"),
                unit_price=D("15000000"),
                discount_amount=D("0"),
                tax_amount=D("1650000"),
                total_amount=D("16650000"),
            ),
        ]

        await add_many_if_missing(db, deal_items)

        activities = [
            CRMActivity(
                id=sid(f"crm-activity:{ctx.code}:lead-001-call"),
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=ctx.lead_ids["lead-001"],
                contact_id=ctx.contact_ids["contact-001"],
                deal_id=ctx.deal_ids["deal-001"],
                assigned_user_id=ctx.user_ids["sales"],
                activity_type=CRMActivityType.CALL,
                status=CRMActivityStatus.PLANNED,
                subject="Follow up kebutuhan pelanggan",
                due_at=datetime(2026, 6, 27, 10, 0),
                completed_at=None,
                notes="Hubungi lead untuk discovery kebutuhan.",
            )
        ]

        await add_many_if_missing(db, activities)

    await db.flush()