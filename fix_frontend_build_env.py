from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil
import sys

ROOT = Path.cwd()
COMPOSE = ROOT / "docker-compose.yml"


def main() -> int:
    if not COMPOSE.exists():
        print(f"❌ File tidak ditemukan: {COMPOSE}", file=sys.stderr)
        return 1

    original = COMPOSE.read_text(encoding="utf-8")

    candidates = (
        "      NODE_ENV: development\n",
        '      NODE_ENV: "development"\n',
        "      NODE_ENV: 'development'\n",
    )

    updated = original
    removed = False

    for candidate in candidates:
        if candidate in updated:
            updated = updated.replace(candidate, "", 1)
            removed = True
            break

    if not removed:
        print(
            "ℹ️ NODE_ENV development tidak ditemukan di docker-compose.yml. "
            "Tidak ada file yang diubah."
        )
        return 0

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = COMPOSE.with_name(f"docker-compose.yml.backup-{timestamp}")
    shutil.copy2(COMPOSE, backup)

    COMPOSE.write_text(updated, encoding="utf-8", newline="\n")

    print("✅ NODE_ENV: development dihapus dari service frontend.")
    print(f"🛡️ Backup: {backup}")
    print()
    print("Jalankan berikutnya:")
    print("  docker compose up -d --force-recreate frontend")
    print("  docker compose exec frontend rm -rf .next")
    print("  docker compose exec frontend pnpm build")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
