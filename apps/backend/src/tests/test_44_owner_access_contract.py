from pathlib import Path
from types import SimpleNamespace

from src.security.permission_catalog import (
    ALL_PERMISSION_KEYS,
    is_owner_company_access,
)


ROOT = Path(__file__).resolve().parents[2]


def test_owner_runtime_has_full_company_and_feature_permissions():
    required = {
        "company.profile.view",
        "company.profile.update",
        "company.branches.manage",
        "products.products.create",
        "products.stock.update",
        "finance.transactions.create",
        "hr.employees.create",
        "crm.deals.create",
        "admin.settings.manage",
        "ai.analytics.view",
    }

    assert required.issubset(set(ALL_PERMISSION_KEYS))


def test_owner_detection_accepts_access_flag_or_owner_role():
    access_flag = SimpleNamespace(
        is_owner=True,
        role=SimpleNamespace(code="staff", is_owner_role=False),
    )
    owner_role = SimpleNamespace(
        is_owner=False,
        role=SimpleNamespace(code="owner", is_owner_role=True),
    )

    assert is_owner_company_access(access_flag)
    assert is_owner_company_access(owner_role)


def test_production_migration_backfills_existing_owner_access():
    migration = ROOT / "migrations/versions/c03d4e5f6a78_owner_permission_catalog_backfill.py"
    source = migration.read_text(encoding="utf-8")

    assert "INSERT INTO user_permissions" in source
    assert "INSERT INTO user_role_permissions" in source
    assert "LOWER(role.code) IN ('owner', 'admin')" in source
    assert "SET is_owner = TRUE" in source
    assert "access_scope = 'ALL_BRANCHES'" in source


def test_auth_runtime_does_not_depend_on_demo_seed_for_owner_permissions():
    auth_service = (ROOT / "src/modules/auth/service_auth.py").read_text(encoding="utf-8")
    dependencies = (ROOT / "src/security/dependencies/dependencies.py").read_text(encoding="utf-8")

    assert "ensure_permission_catalog" in auth_service
    assert "permissions.extend(ALL_PERMISSION_KEYS)" in auth_service
    assert "permissions = list(ALL_PERMISSION_KEYS)" in dependencies
