# Import semua model agar metadata membaca seluruh tabel.
# Ini penting untuk seed development yang masih memakai Base.metadata.create_all().
from src.modules.company.model_company import Company, CompanyBranch  # noqa: E402,F401

from src.modules.users.model_user import (  # noqa: E402,F401
    User,
    UserRole,
    UserPermission,
    UserRolePermission,
    UserCompanyAccess,
    UserBranchAccess,
)

from src.modules.finance.model_finance import (  # noqa: E402,F401
    FinanceAccountingPeriod,
    FinanceAccount,
    FinanceTaxRate,
    FinanceCashAccount,
    FinanceTransaction,
    FinanceTransactionLine,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceTaxRecord,
    FinanceBudget,
    FinanceBudgetLine,
    FinanceProfitLossSnapshot,
    FinanceCashflowSnapshot,
    FinanceMarginSnapshot,
    FinanceBalanceSheetSnapshot,
    FinanceInvoice,
)

from src.modules.products.model_product import (  # noqa: E402,F401
    ProductCategory,
    Product,
    ProductStock,
    ProductStockMovement,
    ProductSupplier,
)

from src.modules.hr.model_hr import (  # noqa: E402,F401
    Employee,
    AttendanceRecord,
    LeaveType,
    LeaveBalance,
    LeaveRequest,
    HRTask,
    KPIIndicator,
    KPIReview,
    KPIReviewItem,
    PayrollRun,
    PayrollSlip,
)

from src.modules.crm.model_crm import (  # noqa: E402,F401
    CRMLead,
    CRMContact,
    CRMDeal,
    CRMDealItem,
    CRMActivity,
    CRMCampaign,
)

from src.modules.admin.model_admin import SystemSetting
from src.modules.automation.model_automation import (  # noqa: E402,F401
    SalesOrder,
    SalesOrderItem,
    DomainEventOutbox,
)
