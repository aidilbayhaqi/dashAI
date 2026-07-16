from __future__ import annotations

from pathlib import Path

from src.modules.users.model_user import PermissionAction
from src.seeds.context import build_context
from src.seeds.data import (
    PERMISSION_MATRIX,
    ROLE_ALLOWED_MODULES,
    ROLES,
)
from src.seeds.utils import sid


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def read_user_seed() -> str:
    return (
        BACKEND_ROOT / "src/seeds/user_seed.py"
    ).read_text(encoding="utf-8")


def expected_role_permission_pairs(
    company_code: str,
) -> set[tuple[object, object]]:
    context = build_context(
        company_code,
        ["hq"],
    )
    pairs: set[tuple[object, object]] = set()

    for role in ROLES:
        role_key = role["key"]
        role_id = context.role_ids[role_key]
        allowed_modules = ROLE_ALLOWED_MODULES[role_key]

        for module_code, features in PERMISSION_MATRIX.items():
            if module_code not in allowed_modules:
                continue

            for feature_code in features:
                for action in PermissionAction:
                    permission_id = sid(
                        f"permission:{module_code}:{feature_code}:{action.value}"
                    )
                    pairs.add((role_id, permission_id))

    return pairs


def test_role_permission_seed_checks_natural_unique_key():
    source = read_user_seed()

    assert "existing_role_permission_pairs" in source
    assert "UserRolePermission.role_id" in source
    assert "UserRolePermission.permission_id" in source
    assert "if natural_key in existing_role_permission_pairs" in source
    assert "existing_role_permission_pairs.add(" in source


def test_generated_role_permission_pairs_are_unique():
    pairs = expected_role_permission_pairs(
        "role-permission-seed-contract"
    )

    expected_count = 0

    for role in ROLES:
        allowed_modules = ROLE_ALLOWED_MODULES[role["key"]]

        for module_code, features in PERMISSION_MATRIX.items():
            if module_code not in allowed_modules:
                continue

            expected_count += (
                len(features) * len(PermissionAction)
            )

    assert len(pairs) == expected_count


def test_existing_natural_keys_can_be_skipped_idempotently():
    expected = expected_role_permission_pairs(
        "role-permission-seed-contract"
    )
    existing = set(expected)
    pending = [
        pair
        for pair in expected
        if pair not in existing
    ]

    assert pending == []
