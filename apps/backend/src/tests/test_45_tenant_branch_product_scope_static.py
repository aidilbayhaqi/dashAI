from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = BACKEND_ROOT.parent / "frontend"


def read_backend(relative: str) -> str:
    return (BACKEND_ROOT / relative).read_text(encoding="utf-8")


def read_frontend(relative: str) -> str:
    return (FRONTEND_ROOT / relative).read_text(encoding="utf-8")


def test_owner_remains_full_permission_but_company_scoped():
    dependencies = read_backend("src/security/dependencies/dependencies.py")
    tenant = read_backend("src/security/tenant.py")

    assert "permissions = list(ALL_PERMISSION_KEYS)" in dependencies
    assert "requested_company_id != current_user.company_id" in tenant
    assert "raise tenant_not_found()" in tenant


def test_company_branch_and_sales_automation_validate_tenant_scope():
    company_route = read_backend("src/modules/company/route_company.py")
    automation_route = read_backend("src/modules/automation/route_automation.py")

    assert "ensure_company_access(" in company_route
    assert "ensure_branch_belongs_to_company(" in automation_route
    assert "requested_company_id=payload.company_id" in automation_route


def test_login_and_me_expose_default_branch_for_frontend_auto_selection():
    auth_schema = read_backend("src/modules/auth/schema_auth.py")
    auth_service = read_backend("src/modules/auth/service_auth.py")
    auth_route = read_backend("src/modules/auth/route_auth.py")

    assert "default_branch_id: UUID | None = None" in auth_schema
    assert "default_branch_id=response_default_branch_id" in auth_service
    assert "current_user.default_branch_id" in auth_route


def test_production_frontend_forces_https_and_does_not_hide_unstocked_products():
    runtime_url = read_frontend("lib/runtime-url.ts")
    product_branch = read_frontend("lib/product-branch.ts")
    hr_api = read_frontend("features/hr/api.ts")

    assert 'url.protocol = "https:"' in runtime_url
    assert "Stock record hanya" in product_branch
    assert "Response kosong adalah hasil valid" in hr_api
