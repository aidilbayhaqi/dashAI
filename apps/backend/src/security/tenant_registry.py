from dataclasses import dataclass, field

from src.modules.crm.model_crm import (
    CRMActivity,
    CRMContact,
    CRMDeal,
    CRMLead,
)
from src.modules.finance.model_finance import (
    FinanceAccount,
    FinanceAccountingPeriod,
    FinanceBudget,
    FinanceBudgetLine,
    FinanceCashAccount,
    FinanceCashflowSnapshot,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceMarginSnapshot,
    FinanceProfitLossSnapshot,
    FinanceTaxRate,
    FinanceTaxRecord,
    FinanceTransaction,
    FinanceTransactionLine,
    FinanceBalanceSheetSnapshot,
)
from src.modules.hr.model_hr import (
    AttendanceRecord,
    Employee,
    HRTask,
    KPIReview,
    LeaveRequest,
    LeaveType,
    PayrollRun,
)
from src.modules.products.model_product import (
    Product,
    ProductCategory,
    ProductStock,
)
from src.security.tenant import TenantParentConfig


@dataclass(frozen=True)
class ModelTenantConfig:
    tenant_parent: TenantParentConfig | None = None
    tenant_relations: dict[str, type] = field(default_factory=dict)
    user_company_fields: frozenset[str] = frozenset()
    current_user_fields: frozenset[str] = frozenset()


DEFAULT_TENANT_CONFIG = ModelTenantConfig()


TENANT_MODEL_CONFIGS: dict[type, ModelTenantConfig] = {
    # =====================================================
    # PRODUCTS
    # =====================================================
    Product: ModelTenantConfig(
        tenant_relations={
            "category_id": ProductCategory,
        },
        current_user_fields=frozenset({"created_by_id"}),
    ),
    ProductStock: ModelTenantConfig(
        tenant_relations={
            "product_id": Product,
        },
    ),

    # =====================================================
    # HR
    # =====================================================
    Employee: ModelTenantConfig(
        user_company_fields=frozenset({"user_id"}),
    ),
    AttendanceRecord: ModelTenantConfig(
        tenant_relations={
            "employee_id": Employee,
        },
    ),
    LeaveRequest: ModelTenantConfig(
        tenant_relations={
            "employee_id": Employee,
            "leave_type_id": LeaveType,
        },
    ),
    HRTask: ModelTenantConfig(
        tenant_relations={
            "employee_id": Employee,
        },
        current_user_fields=frozenset({"assigned_by_id"}),
    ),
    PayrollRun: ModelTenantConfig(
        current_user_fields=frozenset({"created_by_id"}),
    ),
    KPIReview: ModelTenantConfig(
        tenant_relations={
            "employee_id": Employee,
        },
        user_company_fields=frozenset({"reviewer_user_id"}),
    ),

    # =====================================================
    # CRM
    # =====================================================
    CRMLead: ModelTenantConfig(
        user_company_fields=frozenset({"owner_user_id"}),
    ),
    CRMContact: ModelTenantConfig(
        tenant_relations={
            "lead_id": CRMLead,
        },
        user_company_fields=frozenset({"owner_user_id"}),
    ),
    CRMDeal: ModelTenantConfig(
        tenant_relations={
            "lead_id": CRMLead,
            "contact_id": CRMContact,
        },
        user_company_fields=frozenset({"owner_user_id"}),
    ),
    CRMActivity: ModelTenantConfig(
        tenant_relations={
            "lead_id": CRMLead,
            "contact_id": CRMContact,
            "deal_id": CRMDeal,
        },
        user_company_fields=frozenset({"assigned_user_id"}),
    ),

    # =====================================================
    # FINANCE
    # =====================================================
    FinanceAccount: ModelTenantConfig(
        tenant_relations={
            "parent_account_id": FinanceAccount,
        },
    ),
    FinanceCashAccount: ModelTenantConfig(
        tenant_relations={
            "account_id": FinanceAccount,
        },
    ),
    FinanceTransaction: ModelTenantConfig(
        tenant_relations={
            "period_id": FinanceAccountingPeriod,
            "cash_account_id": FinanceCashAccount,
        },
        current_user_fields=frozenset({"created_by"}),
    ),
    FinanceTransactionLine: ModelTenantConfig(
        tenant_parent=TenantParentConfig(
            field_name="transaction_id",
            model_class=FinanceTransaction,
        ),
        tenant_relations={
            "account_id": FinanceAccount,
            "tax_rate_id": FinanceTaxRate,
        },
    ),
    FinanceJournalEntry: ModelTenantConfig(
        tenant_relations={
            "period_id": FinanceAccountingPeriod,
            "transaction_id": FinanceTransaction,
        },
        current_user_fields=frozenset({"created_by"}),
    ),
    FinanceJournalLine: ModelTenantConfig(
        tenant_parent=TenantParentConfig(
            field_name="journal_entry_id",
            model_class=FinanceJournalEntry,
        ),
        tenant_relations={
            "account_id": FinanceAccount,
        },
    ),
    FinanceTaxRecord: ModelTenantConfig(
        tenant_relations={
            "period_id": FinanceAccountingPeriod,
            "tax_rate_id": FinanceTaxRate,
            "transaction_id": FinanceTransaction,
        },
    ),
    FinanceBudgetLine: ModelTenantConfig(
        tenant_parent=TenantParentConfig(
            field_name="budget_id",
            model_class=FinanceBudget,
        ),
        tenant_relations={
            "account_id": FinanceAccount,
        },
    ),
    FinanceProfitLossSnapshot: ModelTenantConfig(
        tenant_relations={
            "period_id": FinanceAccountingPeriod,
        },
    ),
    FinanceCashflowSnapshot: ModelTenantConfig(
        tenant_relations={
            "period_id": FinanceAccountingPeriod,
        },
    ),
    FinanceMarginSnapshot: ModelTenantConfig(
        tenant_relations={
            "period_id": FinanceAccountingPeriod,
        },
    ),
    FinanceBalanceSheetSnapshot: ModelTenantConfig(
        tenant_relations={
            "period_id": FinanceAccountingPeriod,
        },
    ),
}


def get_model_tenant_config(model_class: type) -> ModelTenantConfig:
    return TENANT_MODEL_CONFIGS.get(
        model_class,
        DEFAULT_TENANT_CONFIG,
    )
