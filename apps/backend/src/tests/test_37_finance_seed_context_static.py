from __future__ import annotations

from src.seeds.context import build_context
from src.seeds.data import FINANCE_ACCOUNTS


def test_finance_seed_context_contains_every_chart_of_account_code():
    context = build_context(
        "finance-seed-contract",
        ["hq"],
    )

    expected_codes = {
        str(account_spec[0])
        for account_spec in FINANCE_ACCOUNTS
    }

    assert set(context.account_ids) == expected_codes
    assert "2300" in context.account_ids
    assert "6300" in context.account_ids


def test_finance_account_seed_ids_are_unique_and_deterministic():
    first = build_context(
        "finance-seed-contract",
        ["hq"],
    )
    second = build_context(
        "finance-seed-contract",
        ["hq"],
    )

    assert first.account_ids == second.account_ids
    assert len(first.account_ids.values()) == len(
        set(first.account_ids.values())
    )
