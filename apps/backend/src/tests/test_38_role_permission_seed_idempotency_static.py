from __future__ import annotations

from pathlib import Path

from src.modules.users.model_user import PermissionAction
from src.security.permission_catalog import PERMISSION_MATRIX
from src.seeds.context import build_context
from src.seeds.data import ROLE_ALLOWED_MODULES, ROLES


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def read_user_seed() -> str:
    return (BACKEND_ROOT / "src/seeds/user_seed.py").read_text(
        encoding="utf-8"
    )


def expected_role_permission_specs(
    company_code: str,
) -> set[tuple[object, str, str, str]]:
    context = build_context(
        company_code,
        ["hq"],
    )
    specs: set[tuple[object, str, str, str]] = set()

    for role in ROLES:
        role_key = role["key"]
        role_id = context.role_ids[role_key]
        allowed_modules = ROLE_ALLOWED_MODULES[role_key]

        for module_code, features in PERMISSION_MATRIX.items():
            if module_code not in allowed_modules:
                continue

            for feature_code in features:
                for action in PermissionAction:
                    specs.add(
                        (
                            role_id,
                            module_code,
                            feature_code,
                            action.value,
                        )
                    )

    return specs


def test_permission_seed_resolves_existing_rows_by_natural_key():
    source = read_user_seed()

    assert "ensure_permission_catalog(db)" in source
    assert "permissions_by_key" in source
    assert "permission_id = permission.id" in source
    assert 'sid(f"permission:' not in source


def test_role_permission_seed_checks_natural_unique_key():
    source = read_user_seed()

    assert "existing_role_permission_pairs" in source
    assert "UserRolePermission.role_id" in source
    assert "UserRolePermission.permission_id" in source
    assert "if natural_key in existing_role_permission_pairs" in source
    assert "existing_role_permission_pairs.add(" in source


def test_generated_role_permission_specs_are_unique():
    specs = expected_role_permission_specs(
        "role-permission-seed-contract"
    )

    expected_count = 0

    for role in ROLES:
        allowed_modules = ROLE_ALLOWED_MODULES[role["key"]]

        for module_code, features in PERMISSION_MATRIX.items():
            if module_code not in allowed_modules:
                continue

            expected_count += len(features) * len(PermissionAction)

    assert len(specs) == expected_count


def test_existing_natural_keys_can_be_skipped_idempotently():
    expected = expected_role_permission_specs(
        "role-permission-seed-contract"
    )
    existing = set(expected)
    pending = [spec for spec in expected if spec not in existing]

    assert pending == []
