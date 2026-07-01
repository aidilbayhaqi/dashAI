from src.modules.company.model_company import BranchType
from src.modules.finance.model_finance import AccountType, NormalBalance
from src.modules.products.model_product import ProductType
from src.modules.users.model_user import AccessScope


COMPANIES = [
    {
        "code": "nud",
        "name": "PT Nusantara Digital Utama",
        "legal_name": "PT Nusantara Digital Utama",
        "tax_number": "SEED-NPWP-NDU-001",
        "email": "hello@nud.test",
        "phone": "+62-21-5010-1001",
        "industry": "Software ERP",
        "company_size": "51-200",
        "city": "Jakarta Pusat",
        "province": "DKI Jakarta",
        "branches": [
            {
                "key": "hq",
                "code": "NDU-HQ",
                "name": "Kantor Pusat Jakarta",
                "branch_type": BranchType.HEAD_OFFICE,
                "is_head_office": True,
                "city": "Jakarta Pusat",
                "province": "DKI Jakarta",
            },
            {
                "key": "bdg",
                "code": "NDU-BDG",
                "name": "Cabang Bandung",
                "branch_type": BranchType.BRANCH,
                "is_head_office": False,
                "city": "Bandung",
                "province": "Jawa Barat",
            },
            {
                "key": "wh",
                "code": "NDU-WH",
                "name": "Gudang Bekasi",
                "branch_type": BranchType.WAREHOUSE,
                "is_head_office": False,
                "city": "Bekasi",
                "province": "Jawa Barat",
            },
        ],
    },
    {
        "code": "bkm",
        "name": "PT Bengkalis Konstruksi Mandiri",
        "legal_name": "PT Bengkalis Konstruksi Mandiri",
        "tax_number": "SEED-NPWP-BKM-001",
        "email": "hello@bkm.test",
        "phone": "+62-766-700-2002",
        "industry": "Konstruksi",
        "company_size": "201-500",
        "city": "Bengkalis",
        "province": "Riau",
        "branches": [
            {
                "key": "hq",
                "code": "BKM-HQ",
                "name": "Kantor Pusat Bengkalis",
                "branch_type": BranchType.HEAD_OFFICE,
                "is_head_office": True,
                "city": "Bengkalis",
                "province": "Riau",
            },
            {
                "key": "site",
                "code": "BKM-SITE",
                "name": "Site Project Dumai",
                "branch_type": BranchType.BRANCH,
                "is_head_office": False,
                "city": "Dumai",
                "province": "Riau",
            },
            {
                "key": "wh",
                "code": "BKM-WH",
                "name": "Gudang Material Pekanbaru",
                "branch_type": BranchType.WAREHOUSE,
                "is_head_office": False,
                "city": "Pekanbaru",
                "province": "Riau",
            },
        ],
    },
]


ROLES = [
    {
        "key": "owner",
        "code": "owner",
        "name": "Owner",
        "description": "Akses penuh sebagai pemilik perusahaan",
        "is_owner_role": True,
        "is_system_role": True,
    },
    {
        "key": "admin",
        "code": "admin",
        "name": "Administrator",
        "description": "Akses administrasi operasional ERP",
        "is_owner_role": False,
        "is_system_role": True,
    },
    {
        "key": "finance_manager",
        "code": "finance_manager",
        "name": "Finance Manager",
        "description": "Kelola modul finance",
        "is_owner_role": False,
        "is_system_role": False,
    },
    {
        "key": "hr_manager",
        "code": "hr_manager",
        "name": "HR Manager",
        "description": "Kelola modul HR",
        "is_owner_role": False,
        "is_system_role": False,
    },
    {
        "key": "sales_manager",
        "code": "sales_manager",
        "name": "Sales Manager",
        "description": "Kelola modul CRM",
        "is_owner_role": False,
        "is_system_role": False,
    },
    {
        "key": "warehouse_staff",
        "code": "warehouse_staff",
        "name": "Warehouse Staff",
        "description": "Kelola stok dan produk",
        "is_owner_role": False,
        "is_system_role": False,
    },
]


USERS = [
    {
        "key": "owner",
        "full_name": "Owner Demo",
        "email": "owner@{company}.test",
        "phone": "+62-812-1000-0001",
        "role": "owner",
        "default_branch": "hq",
        "access_scope": AccessScope.ALL_BRANCHES,
        "job_title": "Chief Executive Officer",
        "department_name": "Management",
        "is_owner": True,
    },
    {
        "key": "admin",
        "full_name": "Admin Operasional",
        "email": "admin@{company}.test",
        "phone": "+62-812-1000-0002",
        "role": "admin",
        "default_branch": "hq",
        "access_scope": AccessScope.ALL_BRANCHES,
        "job_title": "ERP Administrator",
        "department_name": "Operations",
        "is_owner": False,
    },
    {
        "key": "finance",
        "full_name": "Finance Manager",
        "email": "finance@{company}.test",
        "phone": "+62-812-1000-0003",
        "role": "finance_manager",
        "default_branch": "hq",
        "access_scope": AccessScope.ALL_BRANCHES,
        "job_title": "Finance Manager",
        "department_name": "Finance",
        "is_owner": False,
    },
    {
        "key": "hr",
        "full_name": "HR Manager",
        "email": "hr@{company}.test",
        "phone": "+62-812-1000-0004",
        "role": "hr_manager",
        "default_branch": "hq",
        "access_scope": AccessScope.ALL_BRANCHES,
        "job_title": "HR Manager",
        "department_name": "Human Resources",
        "is_owner": False,
    },
    {
        "key": "sales",
        "full_name": "Sales Manager",
        "email": "sales@{company}.test",
        "phone": "+62-812-1000-0005",
        "role": "sales_manager",
        "default_branch": "hq",
        "access_scope": AccessScope.SELECTED_BRANCHES,
        "job_title": "Sales Manager",
        "department_name": "Sales",
        "is_owner": False,
    },
    {
        "key": "warehouse",
        "full_name": "Warehouse Staff",
        "email": "warehouse@{company}.test",
        "phone": "+62-812-1000-0006",
        "role": "warehouse_staff",
        "default_branch": "wh",
        "access_scope": AccessScope.SELECTED_BRANCHES,
        "job_title": "Warehouse Staff",
        "department_name": "Warehouse",
        "is_owner": False,
    },
]


PERMISSION_MATRIX = {
    "company": [
        "profile",
        "branches",
    ],
    "users": [
        "users",
        "roles",
        "permissions",
        "access",
    ],
    "finance": [
        "accounts",
        "transactions",
        "journals",
        "reports",
        "tax-rates",
        "cash-accounts",
        "budgets",
        "snapshots",
    ],
    "products": [
        "categories",
        "products",
        "stock",
        "movements",
    ],
    "hr": [
        "employees",
        "attendance",
        "leave",
        "tasks",
        "kpi",
        "payroll",
    ],
    "crm": [
        "leads",
        "contacts",
        "deals",
        "activities",
    ],
}


ROLE_ALLOWED_MODULES = {
    "owner": {"company", "users", "finance", "products", "hr", "crm"},
    "admin": {"company", "users", "finance", "products", "hr", "crm"},
    "finance_manager": {"company", "finance"},
    "hr_manager": {"company", "users", "hr"},
    "sales_manager": {"company", "products", "crm"},
    "warehouse_staff": {"company", "products"},
}


FINANCE_ACCOUNTS = [
    ("1000", "Aset", AccountType.ASSET, NormalBalance.DEBIT, None, False, False, False),
    ("1100", "Kas dan Setara Kas", AccountType.ASSET, NormalBalance.DEBIT, "1000", True, False, False),
    ("1110", "Kas Kecil", AccountType.ASSET, NormalBalance.DEBIT, "1100", True, False, False),
    ("1120", "Bank Operasional", AccountType.ASSET, NormalBalance.DEBIT, "1100", True, True, False),
    ("1200", "Piutang Usaha", AccountType.ASSET, NormalBalance.DEBIT, "1000", False, False, False),
    ("1300", "Persediaan", AccountType.ASSET, NormalBalance.DEBIT, "1000", False, False, False),
    ("2000", "Liabilitas", AccountType.LIABILITY, NormalBalance.CREDIT, None, False, False, False),
    ("2100", "Utang Usaha", AccountType.LIABILITY, NormalBalance.CREDIT, "2000", False, False, False),
    ("2200", "Utang Pajak", AccountType.TAX, NormalBalance.CREDIT, "2000", False, False, True),
    ("3000", "Ekuitas", AccountType.EQUITY, NormalBalance.CREDIT, None, False, False, False),
    ("3100", "Modal Disetor", AccountType.EQUITY, NormalBalance.CREDIT, "3000", False, False, False),
    ("4000", "Pendapatan", AccountType.REVENUE, NormalBalance.CREDIT, None, False, False, False),
    ("4100", "Pendapatan Penjualan", AccountType.REVENUE, NormalBalance.CREDIT, "4000", False, False, False),
    ("5000", "Harga Pokok Penjualan", AccountType.COST_OF_GOODS_SOLD, NormalBalance.DEBIT, None, False, False, False),
    ("5100", "HPP Barang", AccountType.COST_OF_GOODS_SOLD, NormalBalance.DEBIT, "5000", False, False, False),
    ("6000", "Beban Operasional", AccountType.EXPENSE, NormalBalance.DEBIT, None, False, False, False),
    ("6100", "Beban Gaji", AccountType.EXPENSE, NormalBalance.DEBIT, "6000", False, False, False),
    ("6200", "Beban Sewa", AccountType.EXPENSE, NormalBalance.DEBIT, "6000", False, False, False),
]


PRODUCT_CATEGORIES = [
    ("software", "SOFTWARE", "Software", "Produk digital"),
    ("service", "SERVICE", "Layanan", "Produk jasa"),
    ("material", "MATERIAL", "Material", "Material konstruksi"),
    ("hardware", "HARDWARE", "Hardware", "Perangkat fisik"),
]


PRODUCTS = [
    ("prd-001", "ERP-PRO-001", "DashAI ERP Pro License", "software", ProductType.DIGITAL, "license", "1200000", "2500000", False),
    ("prd-002", "CONS-IMP-001", "Implementation Service", "service", ProductType.SERVICE, "project", "8000000", "15000000", False),
    ("prd-003", "MAT-CMT-001", "Semen Portland 50kg", "material", ProductType.PHYSICAL, "zak", "55000", "69000", True),
    ("prd-004", "HW-SCN-001", "Barcode Scanner", "hardware", ProductType.PHYSICAL, "pcs", "450000", "850000", True),
]


LEAVE_TYPES = [
    ("annual", "ANNUAL", "Cuti Tahunan", "12.00", True),
    ("sick", "SICK", "Cuti Sakit", "14.00", True),
    ("unpaid", "UNPAID", "Cuti Tidak Dibayar", "0.00", False),
]