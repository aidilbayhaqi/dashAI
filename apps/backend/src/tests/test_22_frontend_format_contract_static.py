from __future__ import annotations

import os
import re
from pathlib import Path

import pytest


pytestmark = pytest.mark.static


def _frontend_root() -> Path:
    candidates: list[Path] = []

    configured = os.getenv("DASHAI_FRONTEND_ROOT")
    if configured:
        candidates.append(Path(configured))

    cwd = Path.cwd().resolve()
    current_file = Path(__file__).resolve()

    candidates.extend(
        [
            cwd / "apps" / "frontend",
            cwd.parent / "frontend",
            cwd.parent / "apps" / "frontend",
            Path("/frontend"),
            Path("/workspace/apps/frontend"),
            Path("/app/apps/frontend"),
        ]
    )

    for parent in current_file.parents:
        candidates.append(parent / "apps" / "frontend")
        candidates.append(parent / "frontend")

    required = (
        Path("lib/value-format.ts"),
        Path("features/product/config.ts"),
        Path("features/hr/config.ts"),
        Path("features/finance/config.ts"),
    )

    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate.resolve(strict=False))
        if key in seen:
            continue
        seen.add(key)

        if all((candidate / item).is_file() for item in required):
            return candidate

    pytest.skip(
        "Frontend source is not mounted. Set "
        "DASHAI_FRONTEND_ROOT or mount apps/frontend."
    )


def _assert_pattern(source: str, pattern: str) -> None:
    assert re.search(pattern, source, re.DOTALL), pattern


def test_value_formatter_separates_currency_quantity_and_rating():
    frontend = _frontend_root()
    source = (
        frontend / "lib" / "value-format.ts"
    ).read_text(encoding="utf-8")

    for currency_key in (
        "cost_price",
        "selling_price",
        "base_salary",
        "total_amount",
        "total_net",
    ):
        assert f'"{currency_key}"' in source

    for quantity_key in (
        "quantity_on_hand",
        "reserved_quantity",
        "reorder_point",
        "work_minutes",
        "overtime_minutes",
    ):
        assert f'"{quantity_key}"' in source

    for decimal_key in (
        "total_days",
        "total_score",
        "target_value",
    ):
        assert f'"{decimal_key}"' in source

    assert 'const RATING_KEYS = new Set(["rating", "grade"])' in source
    assert 'return "currency"' in source
    assert 'return "number"' in source
    assert 'return "decimal"' in source
    assert 'return "rating"' in source


def test_product_columns_do_not_format_stock_as_rupiah():
    frontend = _frontend_root()
    source = (
        frontend / "features" / "product" / "config.ts"
    ).read_text(encoding="utf-8")

    for key in (
        "quantity_on_hand",
        "reserved_quantity",
        "reorder_point",
    ):
        _assert_pattern(
            source,
            rf'key:\s*"{key}"[\s\S]*?format:\s*"number"',
        )

    _assert_pattern(
        source,
        r'key:\s*"selling_price_display"'
        r'[\s\S]*?format:\s*"currency"',
    )


def test_hr_columns_separate_salary_score_rating_and_duration():
    frontend = _frontend_root()
    source = (
        frontend / "features" / "hr" / "config.ts"
    ).read_text(encoding="utf-8")

    _assert_pattern(
        source,
        r'key:\s*"base_salary_display"'
        r'[\s\S]*?format:\s*"currency"',
    )
    _assert_pattern(
        source,
        r'key:\s*"total_score"'
        r'[\s\S]*?format:\s*"decimal"',
    )
    _assert_pattern(
        source,
        r'key:\s*"rating"'
        r'[\s\S]*?format:\s*"rating"',
    )
    _assert_pattern(
        source,
        r'key:\s*"work_minutes"'
        r'[\s\S]*?format:\s*"number"'
        r'[\s\S]*?unit:\s*"menit"',
    )


def test_finance_columns_use_currency_format():
    frontend = _frontend_root()
    source = (
        frontend / "features" / "finance" / "config.ts"
    ).read_text(encoding="utf-8")

    assert source.count('format: "currency"') >= 10
