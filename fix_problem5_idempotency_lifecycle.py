from __future__ import annotations

import re
import shutil
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent

IDEMPOTENCY_FILE = (
    PROJECT_ROOT / "apps" / "frontend" / "lib" / "idempotency.ts"
)
MODULE_CRUD_FILE = (
    PROJECT_ROOT / "apps" / "frontend" / "lib" / "module-crud.ts"
)
PAYROLL_SERVICE_FILE = (
    PROJECT_ROOT
    / "apps"
    / "frontend"
    / "features"
    / "hr"
    / "payroll-service.ts"
)


def backup(path: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = path.with_name(f"{path.name}.backup-{stamp}")
    shutil.copy2(path, backup_path)
    return backup_path


def ensure_files_exist() -> None:
    missing = [
        path
        for path in (
            IDEMPOTENCY_FILE,
            MODULE_CRUD_FILE,
            PAYROLL_SERVICE_FILE,
        )
        if not path.exists()
    ]

    if missing:
        joined = "\n".join(str(path) for path in missing)
        raise FileNotFoundError(
            f"File berikut tidak ditemukan:\n{joined}"
        )


def patch_idempotency_file(source: str) -> str:
    updated = source

    updated = updated.replace(
        "const KEY_TTL_MS = 30_000;",
        (
            "const PENDING_KEY_TTL_MS = 2 * 60_000;\n"
            "const SUCCESS_REPLAY_TTL_MS = 60_000;"
        ),
        1,
    )

    updated = updated.replace(
        "expiresAt: now + KEY_TTL_MS,",
        "expiresAt: now + PENDING_KEY_TTL_MS,",
        1,
    )

    if "export function retainIdempotencyKey(" not in updated:
        marker = "export function clearIdempotencyKey("
        index = updated.find(marker)

        if index == -1:
            raise RuntimeError(
                "Tidak menemukan clearIdempotencyKey() "
                "di lib/idempotency.ts."
            )

        function_code = (
            "export function retainIdempotencyKey(\n"
            "  operation: string,\n"
            "  payload: unknown,\n"
            "  key: string\n"
            ") {\n"
            "  const now = Date.now();\n"
            "  const cacheKey = fingerprint(operation, payload);\n"
            "  const existing = keyCache.get(cacheKey);\n"
            "\n"
            "  if (existing && existing.key !== key) {\n"
            "    return;\n"
            "  }\n"
            "\n"
            "  keyCache.set(cacheKey, {\n"
            "    key,\n"
            "    expiresAt: now + SUCCESS_REPLAY_TTL_MS,\n"
            "  });\n"
            "}\n"
            "\n"
        )

        updated = (
            updated[:index]
            + function_code
            + updated[index:]
        )

    return updated


def patch_client_file(source: str, filename: str) -> str:
    updated = source

    updated = re.sub(
        (
            r'import\s*\{\s*clearIdempotencyKey,\s*'
            r'idempotencyHeaders\s*\}\s*'
            r'from\s*"@/lib/idempotency";'
        ),
        (
            'import {\n'
            '  idempotencyHeaders,\n'
            '  retainIdempotencyKey,\n'
            '} from "@/lib/idempotency";'
        ),
        updated,
        count=1,
    )

    updated = updated.replace(
        "clearIdempotencyKey(operation, body, key);",
        "retainIdempotencyKey(operation, body, key);",
    )

    if "clearIdempotencyKey(operation, body, key);" in updated:
        raise RuntimeError(
            f"Masih ada clearIdempotencyKey() di {filename}."
        )

    if "retainIdempotencyKey(operation, body, key);" not in updated:
        raise RuntimeError(
            f"Tidak menemukan call create idempotency di {filename}."
        )

    return updated


def write_if_changed(
    path: Path,
    original: str,
    updated: str,
) -> None:
    if original == updated:
        print(f"No change: {path}")
        return

    backup_path = backup(path)
    path.write_text(updated, encoding="utf-8")

    print(f"Updated : {path}")
    print(f"Backup  : {backup_path}")


def main() -> None:
    ensure_files_exist()

    idempotency_source = IDEMPOTENCY_FILE.read_text(
        encoding="utf-8"
    )
    module_crud_source = MODULE_CRUD_FILE.read_text(
        encoding="utf-8"
    )
    payroll_source = PAYROLL_SERVICE_FILE.read_text(
        encoding="utf-8"
    )

    idempotency_updated = patch_idempotency_file(
        idempotency_source
    )
    module_crud_updated = patch_client_file(
        module_crud_source,
        "module-crud.ts",
    )
    payroll_updated = patch_client_file(
        payroll_source,
        "payroll-service.ts",
    )

    write_if_changed(
        IDEMPOTENCY_FILE,
        idempotency_source,
        idempotency_updated,
    )
    write_if_changed(
        MODULE_CRUD_FILE,
        module_crud_source,
        module_crud_updated,
    )
    write_if_changed(
        PAYROLL_SERVICE_FILE,
        payroll_source,
        payroll_updated,
    )

    print("\nProblem 5 frontend idempotency lifecycle fixed.")
    print(
        "- Retry request mempertahankan key selama 2 menit."
    )
    print(
        "- Create sukses mempertahankan replay key 60 detik."
    )


if __name__ == "__main__":
    main()
