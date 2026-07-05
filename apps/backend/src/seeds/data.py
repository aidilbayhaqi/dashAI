from src.modules.company.model_company import BranchType
from src.modules.finance.model_finance import AccountType, NormalBalance
from src.modules.products.model_product import ProductType
from src.modules.users.model_user import AccessScope


COMPANIES = [
    {
        "code": "nrt",
        "label": "NRT",
        "name": "PT Nusa Retail Teknologi",
        "legal_name": "PT Nusa Retail Teknologi",
        "tax_number": "SEED-NPWP-NRT-001",
        "email": "hello@nrt.test",
        "phone": "+62-21-5010-1001",
        "industry": "Retail Technology",
        "company_size": "51-200",
        "city": "Jakarta Selatan",
        "province": "DKI Jakarta",
        "branches": [
            {
                "key": "hq",
                "code": "NRT-HQ",
                "name": "NRT Head Office Jakarta",
                "branch_type": BranchType.HEAD_OFFICE,
                "is_head_office": True,
                "city": "Jakarta Selatan",
                "province": "DKI Jakarta",
            },
            {
                "key": "bdg",
                "code": "NRT-STORE-BDG",
                "name": "NRT Store Bandung",
                "branch_type": BranchType.BRANCH,
                "is_head_office": False,
                "city": "Bandung",
                "province": "Jawa Barat",
            },
            {
                "key": "wh",
                "code": "NRT-WH-BKS",
                "name": "NRT Warehouse Bekasi",
                "branch_type": BranchType.WAREHOUSE,
                "is_head_office": False,
                "city": "Bekasi",
                "province": "Jawa Barat",
            },
        ],
    },
    {
        "code": "gkm",
        "label": "GKM",
        "name": "PT Garuda Konstruksi Mandiri",
        "legal_name": "PT Garuda Konstruksi Mandiri",
        "tax_number": "SEED-NPWP-GKM-001",
        "email": "hello@gkm.test",
        "phone": "+62-761-700-2002",
        "industry": "Construction",
        "company_size": "201-500",
        "city": "Pekanbaru",
        "province": "Riau",
        "branches": [
            {
                "key": "hq",
                "code": "GKM-HQ",
                "name": "GKM Head Office Pekanbaru",
                "branch_type": BranchType.HEAD_OFFICE,
                "is_head_office": True,
                "city": "Pekanbaru",
                "province": "Riau",
            },
            {
                "key": "site",
                "code": "GKM-SITE-DMI",
                "name": "GKM Site Project Dumai",
                "branch_type": BranchType.BRANCH,
                "is_head_office": False,
                "city": "Dumai",
                "province": "Riau",
            },
            {
                "key": "wh",
                "code": "GKM-WH-PKU",
                "name": "GKM Material Warehouse",
                "branch_type": BranchType.WAREHOUSE,
                "is_head_office": False,
                "city": "Pekanbaru",
                "province": "Riau",
            },
        ],
    },
]


COMPANY_LABELS = {
    "nrt": "NRT",
    "gkm": "GKM",
}


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
        "full_name": "Owner {company_label}",
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
        "full_name": "Admin Operasional {company_label}",
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
        "full_name": "Finance Manager {company_label}",
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
        "full_name": "HR Manager {company_label}",
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
        "full_name": "Sales Manager {company_label}",
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
        "full_name": "Warehouse Staff {company_label}",
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
        "invoices",
    ],
    "products": [
        "categories",
        "products",
        "stock",
        "movements",
        "suppliers",
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
        "campaigns",
    ],
    "admin": [
        "settings",
    ],
    "ai": [
        "reports",
    ],
}


ROLE_ALLOWED_MODULES = {
    "owner": {"company", "users", "finance", "products", "hr", "crm", "admin", "ai"},
    "admin": {"company", "users", "finance", "products", "hr", "crm", "admin", "ai"},
    "finance_manager": {"company", "finance", "ai"},
    "hr_manager": {"company", "users", "hr", "ai"},
    "sales_manager": {"company", "products", "crm", "ai"},
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


PRODUCT_CATEGORIES_BY_COMPANY = {
    "nrt": [
        ("software", "NRT-SOFTWARE", "Retail Software", "Aplikasi POS, inventory, dan analitik toko"),
        ("service", "NRT-SERVICE", "Implementation Service", "Jasa implementasi dan onboarding retail system"),
        ("material", "NRT-CONSUMABLE", "Store Consumable", "Label, struk, dan perlengkapan operasional toko"),
        ("hardware", "NRT-HARDWARE", "Store Hardware", "Scanner, printer, tablet kasir, dan perangkat toko"),
    ],
    "gkm": [
        ("software", "GKM-DOCS", "Project Documentation", "Template dokumen proyek dan lisensi digital"),
        ("service", "GKM-SERVICE", "Construction Service", "Jasa proyek, instalasi, dan sewa alat"),
        ("material", "GKM-MATERIAL", "Construction Material", "Material bangunan utama"),
        ("hardware", "GKM-EQUIPMENT", "Construction Equipment", "Peralatan proyek dan safety"),
    ],
}


PRODUCTS_BY_COMPANY = {
    "nrt": [
        ("prd-001", "NRT-POS-STARTER", "NRT POS Starter License", "software", ProductType.DIGITAL, "license", "850000", "1850000", False),
        ("prd-002", "NRT-IMPL-RETAIL", "NRT Retail Implementation Package", "service", ProductType.SERVICE, "project", "4500000", "9500000", False),
        ("prd-003", "NRT-LBL-ROLL-58", "Thermal Label Roll 58mm", "material", ProductType.PHYSICAL, "roll", "18000", "35000", True),
        ("prd-004", "NRT-SCN-ZB-01", "Zebra Barcode Scanner Retail", "hardware", ProductType.PHYSICAL, "pcs", "520000", "975000", True),
    ],
    "gkm": [
        ("prd-001", "GKM-CMT-PORTLAND", "Semen Portland 50kg", "material", ProductType.PHYSICAL, "zak", "56000", "72000", True),
        ("prd-002", "GKM-BESI-10MM", "Besi Beton Ulir 10mm", "material", ProductType.PHYSICAL, "batang", "71000", "94000", True),
        ("prd-003", "GKM-HELM-SFTY", "Helm Safety Proyek", "hardware", ProductType.PHYSICAL, "pcs", "42000", "85000", True),
        ("prd-004", "GKM-SEWA-EXC", "Sewa Excavator Harian", "service", ProductType.SERVICE, "day", "1850000", "2750000", False),
    ],
}


LEAVE_TYPES = [
    ("annual", "ANNUAL", "Cuti Tahunan", "12.00", True),
    ("sick", "SICK", "Cuti Sakit", "14.00", True),
    ("unpaid", "UNPAID", "Cuti Tidak Dibayar", "0.00", False),
]


CRM_DATA_BY_COMPANY = {
    "nrt": {
        "leads": [
            {
                "key": "lead-001",
                "name": "Maya Santoso",
                "company_name": "Toko Sinar Mart",
                "email": "maya@sinar-mart.test",
                "phone": "+62-811-2100-1001",
                "source": "website",
                "status": "new",
                "score": 68,
                "estimated_value": "18500000",
                "notes": "Butuh POS multi-cabang untuk minimarket.",
            },
            {
                "key": "lead-002",
                "name": "Dimas Putra",
                "company_name": "FreshMart Bandung",
                "email": "dimas@freshmart.test",
                "phone": "+62-811-2100-1002",
                "source": "referral",
                "status": "qualified",
                "score": 86,
                "estimated_value": "42000000",
                "notes": "Tertarik paket inventory dan loyalty customer.",
            },
        ],
        "deals": [
            {
                "key": "deal-001",
                "title": "Implementasi POS 3 Cabang Sinar Mart",
                "stage": "proposal",
                "expected_value": "18500000",
                "probability_percent": "62.0000",
                "product_key": "prd-001",
                "description": "NRT POS Starter License",
                "unit_price": "1850000",
                "tax_amount": "203500",
                "total_amount": "2053500",
            },
            {
                "key": "deal-002",
                "title": "Retail Inventory System FreshMart",
                "stage": "negotiation",
                "expected_value": "42000000",
                "probability_percent": "78.0000",
                "product_key": "prd-002",
                "description": "NRT Retail Implementation Package",
                "unit_price": "9500000",
                "tax_amount": "1045000",
                "total_amount": "10545000",
            },
        ],
    },
    "gkm": {
        "leads": [
            {
                "key": "lead-001",
                "name": "Budi Hartono",
                "company_name": "PT Riau Infrastruktur",
                "email": "budi@riau-infra.test",
                "phone": "+62-811-2200-2001",
                "source": "tender",
                "status": "contacted",
                "score": 74,
                "estimated_value": "135000000",
                "notes": "Butuh supply material untuk proyek drainase.",
            },
            {
                "key": "lead-002",
                "name": "Sari Wijaya",
                "company_name": "CV Beton Karya",
                "email": "sari@beton-karya.test",
                "phone": "+62-811-2200-2002",
                "source": "partner",
                "status": "qualified",
                "score": 89,
                "estimated_value": "210000000",
                "notes": "Butuh material dan sewa alat berat.",
            },
        ],
        "deals": [
            {
                "key": "deal-001",
                "title": "Supply Material Drainase Dumai",
                "stage": "proposal",
                "expected_value": "135000000",
                "probability_percent": "58.0000",
                "product_key": "prd-001",
                "description": "Semen Portland 50kg",
                "unit_price": "72000",
                "tax_amount": "7920",
                "total_amount": "79920",
            },
            {
                "key": "deal-002",
                "title": "Sewa Excavator Proyek Jalan",
                "stage": "negotiation",
                "expected_value": "210000000",
                "probability_percent": "72.0000",
                "product_key": "prd-004",
                "description": "Sewa Excavator Harian",
                "unit_price": "2750000",
                "tax_amount": "302500",
                "total_amount": "3052500",
            },
        ],
    },
}