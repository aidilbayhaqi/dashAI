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
from src.seeds.data import CRM_DATA_BY_COMPANY
from src.seeds.utils import D, add_many_if_missing, sid


LEAD_STATUS_MAP = {
    "new": LeadStatus.NEW,
    "contacted": LeadStatus.CONTACTED,
    "qualified": LeadStatus.QUALIFIED,
    "unqualified": LeadStatus.UNQUALIFIED,
    "converted": LeadStatus.CONVERTED,
}


DEAL_STAGE_MAP = {
    "prospecting": DealStage.PROSPECTING,
    "qualification": DealStage.QUALIFICATION,
    "proposal": DealStage.PROPOSAL,
    "negotiation": DealStage.NEGOTIATION,
    "won": DealStage.WON,
    "lost": DealStage.LOST,
}


async def seed_crm(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
):
    for ctx in contexts.values():
        crm_data = CRM_DATA_BY_COMPANY[ctx.code]

        leads = []

        for index, lead in enumerate(crm_data["leads"], start=1):
            lead_id = ctx.lead_ids[lead["key"]]

            leads.append(
                CRMLead(
                    id=lead_id,
                    company_id=ctx.company_id,
                    branch_id=ctx.branch_ids["hq"],
                    owner_user_id=ctx.user_ids["sales"],
                    name=lead["name"],
                    company_name=lead["company_name"],
                    email=lead["email"],
                    phone=lead["phone"],
                    source=lead["source"],
                    status=LEAD_STATUS_MAP[lead["status"]],
                    score=lead["score"],
                    estimated_value=D(lead["estimated_value"]),
                    next_follow_up_at=datetime(2026, 7, 5 + index, 10, 0),
                    notes=lead["notes"],
                )
            )

        await add_many_if_missing(db, leads)
        await db.flush()

        contacts = []

        for index, lead in enumerate(crm_data["leads"], start=1):
            lead_key = lead["key"]
            contact_key = f"contact-00{index}"

            contacts.append(
                CRMContact(
                    id=ctx.contact_ids[contact_key],
                    company_id=ctx.company_id,
                    branch_id=ctx.branch_ids["hq"],
                    lead_id=ctx.lead_ids[lead_key],
                    owner_user_id=ctx.user_ids["sales"],
                    name=lead["name"],
                    company_name=lead["company_name"],
                    position="Decision Maker" if index == 1 else "Director",
                    email=lead["email"].replace("@", ".contact@"),
                    phone=lead["phone"],
                )
            )

        await add_many_if_missing(db, contacts)
        await db.flush()

        deals = []

        for index, deal in enumerate(crm_data["deals"], start=1):
            deal_key = deal["key"]
            lead_key = f"lead-00{index}"
            contact_key = f"contact-00{index}"

            deals.append(
                CRMDeal(
                    id=ctx.deal_ids[deal_key],
                    company_id=ctx.company_id,
                    branch_id=ctx.branch_ids["hq"],
                    lead_id=ctx.lead_ids[lead_key],
                    contact_id=ctx.contact_ids[contact_key],
                    owner_user_id=ctx.user_ids["sales"],
                    title=deal["title"],
                    stage=DEAL_STAGE_MAP[deal["stage"]],
                    expected_value=D(deal["expected_value"]),
                    probability_percent=D(deal["probability_percent"]),
                    expected_close_date=date(2026, 7, 15 + index),
                    closed_at=None,
                    won_lost_reason=None,
                    finance_transaction_id=None,
                )
            )

        await add_many_if_missing(db, deals)
        await db.flush()

        deal_items = []

        for index, deal in enumerate(crm_data["deals"], start=1):
            deal_items.append(
                CRMDealItem(
                    id=sid(f"crm-deal-item:{ctx.code}:{deal['key']}:1"),
                    deal_id=ctx.deal_ids[deal["key"]],
                    product_id=ctx.product_ids[deal["product_key"]],
                    description=deal["description"],
                    quantity=D("1"),
                    unit_price=D(deal["unit_price"]),
                    discount_amount=D("0"),
                    tax_amount=D(deal["tax_amount"]),
                    total_amount=D(deal["total_amount"]),
                )
            )

        await add_many_if_missing(db, deal_items)

        activities = []

        for index, lead in enumerate(crm_data["leads"], start=1):
            lead_key = lead["key"]
            contact_key = f"contact-00{index}"
            deal_key = f"deal-00{index}"

            activities.append(
                CRMActivity(
                    id=sid(f"crm-activity:{ctx.code}:{lead_key}:followup"),
                    company_id=ctx.company_id,
                    branch_id=ctx.branch_ids["hq"],
                    lead_id=ctx.lead_ids[lead_key],
                    contact_id=ctx.contact_ids[contact_key],
                    deal_id=ctx.deal_ids[deal_key],
                    assigned_user_id=ctx.user_ids["sales"],
                    activity_type=CRMActivityType.CALL if index == 1 else CRMActivityType.MEETING,
                    status=CRMActivityStatus.PLANNED,
                    subject=f"Follow up {lead['company_name']}",
                    due_at=datetime(2026, 7, 8 + index, 10, 0),
                    completed_at=None,
                    notes=f"CRM activity seed untuk {ctx.code.upper()}",
                )
            )

        await add_many_if_missing(db, activities)

    await db.flush()