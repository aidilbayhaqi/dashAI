from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TARGET = (
    ROOT
    / "apps"
    / "backend"
    / "src"
    / "tests"
    / "test_15_frontend_idempotency_static.py"
)

CONTENT = "from __future__ import annotations\n\nimport os\nfrom pathlib import Path\n\nimport pytest\n\n\npytestmark = pytest.mark.static\n\n\ndef _candidate_frontend_roots() -> list[Path]:\n    candidates: list[Path] = []\n\n    configured = os.getenv(\"DASHAI_FRONTEND_ROOT\")\n    if configured:\n        candidates.append(Path(configured))\n\n    cwd = Path.cwd().resolve()\n    current_file = Path(__file__).resolve()\n\n    candidates.extend(\n        [\n            cwd / \"apps\" / \"frontend\",\n            cwd.parent / \"frontend\",\n            cwd.parent / \"apps\" / \"frontend\",\n            Path(\"/workspace/apps/frontend\"),\n            Path(\"/app/apps/frontend\"),\n            Path(\"/frontend\"),\n        ]\n    )\n\n    for parent in current_file.parents:\n        candidates.append(parent / \"apps\" / \"frontend\")\n        candidates.append(parent / \"frontend\")\n\n    unique: list[Path] = []\n    seen: set[str] = set()\n\n    for candidate in candidates:\n        normalized = str(candidate.resolve(strict=False))\n        if normalized in seen:\n            continue\n\n        seen.add(normalized)\n        unique.append(candidate)\n\n    return unique\n\n\ndef _frontend_root() -> Path:\n    required = (\n        Path(\"lib/module-crud.ts\"),\n        Path(\"lib/idempotency.ts\"),\n        Path(\"features/hr/payroll-service.ts\"),\n    )\n\n    for candidate in _candidate_frontend_roots():\n        if all((candidate / item).is_file() for item in required):\n            return candidate\n\n    pytest.skip(\n        \"Frontend source is not mounted in the API container. \"\n        \"Run this test with apps/frontend mounted, or set \"\n        \"DASHAI_FRONTEND_ROOT.\"\n    )\n\n\ndef test_frontend_create_requests_keep_success_replay_key():\n    frontend = _frontend_root()\n\n    module_crud = (\n        frontend / \"lib\" / \"module-crud.ts\"\n    ).read_text(encoding=\"utf-8\")\n\n    payroll_service = (\n        frontend / \"features\" / \"hr\" / \"payroll-service.ts\"\n    ).read_text(encoding=\"utf-8\")\n\n    for source in (module_crud, payroll_service):\n        assert \"retainIdempotencyKey(\" in source\n        assert (\n            \"clearIdempotencyKey(operation, body, key);\"\n            not in source\n        )\n\n\ndef test_frontend_idempotency_has_pending_and_replay_ttl():\n    frontend = _frontend_root()\n\n    source = (\n        frontend / \"lib\" / \"idempotency.ts\"\n    ).read_text(encoding=\"utf-8\")\n\n    assert \"PENDING_KEY_TTL_MS\" in source\n    assert \"SUCCESS_REPLAY_TTL_MS\" in source\n    assert \"export function retainIdempotencyKey(\" in source\n"


def main() -> None:
    if not TARGET.parent.exists():
        raise FileNotFoundError(
            f"Folder test backend tidak ditemukan: {TARGET.parent}"
        )

    if TARGET.exists():
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = TARGET.with_name(
            f"{TARGET.name}.backup-{stamp}"
        )
        shutil.copy2(TARGET, backup)
        print(f"Backup  : {backup}")

    TARGET.write_text(CONTENT, encoding="utf-8")

    print(f"Updated : {TARGET}")
    print("Marker  : _candidate_frontend_roots")
    print("Expected in API container without FE mount: 2 skipped")


if __name__ == "__main__":
    main()
