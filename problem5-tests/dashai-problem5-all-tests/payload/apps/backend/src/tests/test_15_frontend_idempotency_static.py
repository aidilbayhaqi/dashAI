from __future__ import annotations

import os
from pathlib import Path

import pytest


pytestmark = pytest.mark.static


def _candidate_frontend_roots() -> list[Path]:
    candidates: list[Path] = []

    configured = os.getenv("DASHAI_FRONTEND_ROOT")
    if configured:
        candidates.append(Path(configured))

    current_file = Path(__file__).resolve()
    current_workdir = Path.cwd().resolve()

    candidates.extend(
        [
            current_workdir / "apps" / "frontend",
            current_workdir.parent / "frontend",
            current_workdir.parent / "apps" / "frontend",
            Path("/workspace/apps/frontend"),
            Path("/app/apps/frontend"),
            Path("/frontend"),
        ]
    )

    for parent in current_file.parents:
        candidates.extend(
            [
                parent / "apps" / "frontend",
                parent / "frontend",
            ]
        )

    unique: list[Path] = []
    seen: set[str] = set()

    for candidate in candidates:
        normalized = str(candidate.resolve(strict=False))

        if normalized in seen:
            continue

        seen.add(normalized)
        unique.append(candidate)

    return unique


def _frontend_root() -> Path:
    required_files = (
        Path("lib/module-crud.ts"),
        Path("lib/idempotency.ts"),
        Path("features/hr/payroll-service.ts"),
    )

    for candidate in _candidate_frontend_roots():
        if all((candidate / path).is_file() for path in required_files):
            return candidate

    pytest.skip(
        "Frontend source is not mounted in the API container. "
        "Run this test from the monorepo host, or mount "
        "apps/frontend and set DASHAI_FRONTEND_ROOT."
    )


def test_frontend_create_requests_keep_success_replay_key():
    frontend = _frontend_root()

    module_crud = (
        frontend / "lib" / "module-crud.ts"
    ).read_text(encoding="utf-8")

    payroll_service = (
        frontend / "features" / "hr" / "payroll-service.ts"
    ).read_text(encoding="utf-8")

    for source in (module_crud, payroll_service):
        assert "retainIdempotencyKey(" in source
        assert (
            "clearIdempotencyKey(operation, body, key);"
            not in source
        )


def test_frontend_idempotency_has_pending_and_replay_ttl():
    frontend = _frontend_root()

    source = (
        frontend / "lib" / "idempotency.ts"
    ).read_text(encoding="utf-8")

    assert "PENDING_KEY_TTL_MS" in source
    assert "SUCCESS_REPLAY_TTL_MS" in source
    assert "export function retainIdempotencyKey(" in source
