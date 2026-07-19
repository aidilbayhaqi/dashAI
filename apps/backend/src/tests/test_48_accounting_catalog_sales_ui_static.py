from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parents[1]


def test_default_account_catalog_contains_sales_automation_accounts():
    catalog = (
        BACKEND_ROOT / "src/modules/finance/account_catalog.py"
    ).read_text(encoding="utf-8")

    for code in ("1120", "1200", "1300", "2200", "4100", "5100"):
        assert f'"{code}"' in catalog

    assert "ensure_default_chart_of_accounts" in catalog


def test_accounting_bridge_self_heals_missing_company_accounts():
    bridge = (
        BACKEND_ROOT / "src/modules/finance/service_accounting_bridge.py"
    ).read_text(encoding="utf-8")

    assert "await ensure_default_chart_of_accounts" in bridge
    assert "account = accounts.get(code)" in bridge


def test_company_registration_provisions_chart_before_cash_account():
    service = (
        BACKEND_ROOT / "src/modules/auth/service_auth.py"
    ).read_text(encoding="utf-8")

    assert "accounts = await ensure_default_chart_of_accounts" in service
    assert 'finance_account = accounts["1120"]' in service


def test_production_migration_backfills_chart_for_existing_companies():
    migration = (
        BACKEND_ROOT
        / "migrations/versions/f36a7b8c9d01_default_chart_of_accounts.py"
    ).read_text(encoding="utf-8")

    assert 'revision: str = "f36a7b8c9d01"' in migration
    assert 'down_revision: Union[str, Sequence[str], None] = "e25f6a7b8c90"' in migration
    assert '"1200", "Piutang Usaha"' in migration
    assert "INSERT INTO finance_accounts" in migration


def test_sales_automation_rule_catalog_card_is_removed():
    client = (
        REPO_ROOT / "apps/frontend/features/automation/client.tsx"
    ).read_text(encoding="utf-8")

    assert "ERP rule catalog" not in client
    assert "Automation rules untuk seluruh module" not in client
    assert "getAutomationRules" not in client
    assert "rulesQuery" not in client
