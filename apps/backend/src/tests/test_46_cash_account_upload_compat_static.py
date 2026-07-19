from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parents[1]


def test_cash_account_create_can_provision_linked_ledger_account():
    schema = (BACKEND_ROOT / "src/modules/finance/schema_finance.py").read_text()
    policy = (BACKEND_ROOT / "src/modules/finance/policy_finance.py").read_text()

    assert "account_id: UUID | None = None" in schema
    assert "_create_linked_finance_account" in policy
    assert 'data["account_id"] = linked_account.id' in policy
    assert 'data["is_default"] = True' in policy


def test_production_migration_backfills_cash_and_normalizes_upload_urls():
    migration = (
        BACKEND_ROOT
        / "migrations/versions/e25f6a7b8c90_default_cash_accounts_upload_urls.py"
    ).read_text()

    assert 'revision: str = "e25f6a7b8c90"' in migration
    assert 'down_revision: Union[str, Sequence[str], None] = "d14e5f6a7b89"' in migration
    assert "INSERT INTO finance_cash_accounts" in migration
    assert "products" in migration
    assert "regexp_replace" in migration


def test_frontend_has_cash_account_page_and_managed_file_rebase():
    page = (
        REPO_ROOT
        / "apps/frontend/app/(dashboard)/finance/cash-accounts/page.tsx"
    ).read_text()
    runtime_url = (REPO_ROOT / "apps/frontend/lib/runtime-url.ts").read_text()

    assert 'moduleKey="cash-accounts"' in page
    assert "MANAGED_FILE_PREFIXES" in runtime_url
    assert "isManagedDashAiFilePath(url.pathname)" in runtime_url
