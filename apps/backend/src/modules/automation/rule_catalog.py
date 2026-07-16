from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class AutomationRuleDefinition:
    key: str
    name: str
    domain: str
    trigger: str
    actions: tuple[str, ...]
    accounting_effect: str
    guardrails: tuple[str, ...]
    enabled_by_default: bool = True
    ai_visible: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "domain": self.domain,
            "trigger": self.trigger,
            "actions": list(self.actions),
            "accounting_effect": self.accounting_effect,
            "guardrails": list(self.guardrails),
            "enabled_by_default": self.enabled_by_default,
            "ai_visible": self.ai_visible,
        }


ERP_AUTOMATION_RULES: tuple[AutomationRuleDefinition, ...] = (
    AutomationRuleDefinition(
        key="sales_order_fulfillment",
        name="Sales order to invoice",
        domain="sales",
        trigger="sales_order.processed",
        actions=(
            "Validate branch stock and product availability",
            "Create stock movements",
            "Create a sent customer invoice",
            "Create a draft income transaction",
            "Accrue invoice tax when tax is greater than zero",
        ),
        accounting_effect=(
            "No cash movement at fulfillment. Cash increases only after payment confirmation."
        ),
        guardrails=(
            "Idempotent by company, source module, and source id",
            "Requires an active cash account before payment",
            "Cannot reduce stock below available quantity",
        ),
    ),
    AutomationRuleDefinition(
        key="invoice_payment_to_cash",
        name="Invoice payment to cashflow",
        domain="finance",
        trigger="finance.invoice.payment_recorded",
        actions=(
            "Increase selected cash account balance",
            "Create or post the linked income transaction",
            "Update invoice paid amount and payment status",
            "Publish finance and dashboard invalidation events",
        ),
        accounting_effect="Posted operating cash inflow and recognized revenue.",
        guardrails=(
            "Payment cannot exceed outstanding amount",
            "Cancelled invoices cannot receive payment",
            "Repeated payment confirmation cannot increase cash twice",
        ),
    ),
    AutomationRuleDefinition(
        key="expense_to_cashflow",
        name="Expense posting to cashflow",
        domain="finance",
        trigger="finance.transaction.posted",
        actions=(
            "Decrease the selected cash account for expense transactions",
            "Include the transaction in monthly and yearly cashflow calculations",
            "Publish finance and dashboard invalidation events",
        ),
        accounting_effect="Posted operating, investing, or financing cash outflow.",
        guardrails=(
            "Only draft transactions can be posted",
            "Posted transactions are reversed through void workflow",
            "Automatically generated records cannot be deleted directly",
        ),
    ),
    AutomationRuleDefinition(
        key="invoice_tax_accrual",
        name="Invoice tax accrual",
        domain="tax",
        trigger="finance.invoice.sent",
        actions=(
            "Create one accrued tax record per invoice",
            "Use the active PPN rate when available",
            "Use invoice subtotal and tax values as the tax evidence",
        ),
        accounting_effect="Accrued tax liability without immediate cash movement.",
        guardrails=(
            "No tax record when invoice tax is zero",
            "Unique by company and invoice reference",
            "Tax payment uses a separate cash-out command",
        ),
    ),
    AutomationRuleDefinition(
        key="monthly_payroll_calculation",
        name="Attendance and KPI payroll",
        domain="hr",
        trigger="hr.payroll.calculate",
        actions=(
            "Calculate absence and lateness deductions",
            "Calculate overtime from approved attendance minutes",
            "Calculate KPI performance bonus",
            "Create one payroll slip per active employee",
            "Create one draft payroll expense transaction",
        ),
        accounting_effect=(
            "Draft payroll expense is created after calculation; cash decreases only when posted."
        ),
        guardrails=(
            "One slip per employee and payroll run",
            "Cancelled payroll cannot be recalculated",
            "Finance transaction is idempotent by payroll run",
        ),
    ),
    AutomationRuleDefinition(
        key="crm_deal_won",
        name="CRM won deal settlement",
        domain="crm",
        trigger="crm.deal.won",
        actions=(
            "Recalculate deal value from deal items",
            "Create one draft income transaction",
            "Confirm settlement through a dedicated payment command",
        ),
        accounting_effect=(
            "Winning a deal does not create cash. Cash increases after settlement confirmation."
        ),
        guardrails=(
            "One finance transaction per deal",
            "Only won deals can be settled",
            "Settlement requires an active company cash account",
        ),
    ),
    AutomationRuleDefinition(
        key="excel_bulk_import",
        name="Excel bulk import",
        domain="platform",
        trigger="user.excel_import",
        actions=(
            "Parse the first Excel or CSV worksheet",
            "Map headers to module field keys or labels",
            "Persist each row through the existing create workflow",
            "Return imported and failed row counts",
        ),
        accounting_effect="Depends on the destination module and its normal domain commands.",
        guardrails=(
            "Uses the same tenant validation as manual create",
            "Rows are not inserted only into browser memory",
            "Import does not bypass required fields or permissions",
        ),
    ),
    AutomationRuleDefinition(
        key="periodic_finance_reporting",
        name="Monthly and yearly reporting",
        domain="reporting",
        trigger="finance.report.generate",
        actions=(
            "Aggregate posted income and expense transactions",
            "Aggregate operating, investing, and financing cashflow",
            "Generate period snapshots for export and AI analysis",
        ),
        accounting_effect="Read-only financial aggregation.",
        guardrails=(
            "Only posted transactions are counted",
            "Reports are tenant and period scoped",
            "Source transactions remain immutable",
        ),
    ),
)


def list_automation_rules() -> list[dict[str, Any]]:
    return [rule.as_dict() for rule in ERP_AUTOMATION_RULES]
