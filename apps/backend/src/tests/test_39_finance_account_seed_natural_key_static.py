from __future__ import annotations

from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def read_finance_seed() -> str:
    return (
        BACKEND_ROOT / "src/seeds/finance_seed.py"
    ).read_text(encoding="utf-8")


def test_finance_account_seed_uses_company_code_natural_key():
    source = read_finance_seed()

    assert "canonical_account_codes" in source
    assert "existing_accounts_by_code" in source
    assert "FinanceAccount.company_id == ctx.company_id" in source
    assert "FinanceAccount.code.in_(" in source
    assert "ctx.account_ids[code] = account.id" in source
    assert "if code in existing_accounts_by_code" in source


def test_migration_created_accounts_are_reused_not_inserted_again():
    source = read_finance_seed()

    assert "Migrations can create canonical accounts" in source
    assert "continue" in source
    assert "legacy canonical account IDs" in source


def test_parent_ids_are_refreshed_before_child_insertion():
    source = read_finance_seed()

    parent_refresh_position = source.index(
        "Refresh the natural-key map after parent insertion"
    )
    child_insert_position = source.index(
        "await add_many_if_missing(db, child_accounts)"
    )

    assert parent_refresh_position < child_insert_position
