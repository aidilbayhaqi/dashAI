from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
TARGET = (
    PROJECT_ROOT
    / "apps"
    / "frontend"
    / "components"
    / "modules"
    / "module-page.tsx"
)

OLD_BLOCK = r'''            const rawValue = row[field.key] ?? "-";
            const value = String(rawValue || "-");'''

NEW_BLOCK = r'''            const rawValue = row[field.key];
            const rawText = String(rawValue ?? "").trim();
            const value = rawText || "-";'''


def main() -> None:
    if not TARGET.exists():
        raise FileNotFoundError(
            f"File tidak ditemukan: {TARGET}"
        )

    source = TARGET.read_text(encoding="utf-8")

    if NEW_BLOCK in source:
        print("Fix sudah terpasang. Tidak ada perubahan.")
        return

    if OLD_BLOCK not in source:
        raise RuntimeError(
            "Blok target tidak ditemukan. "
            "File mungkin sudah berubah; jangan patch manual."
        )

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = TARGET.with_name(
        f"{TARGET.name}.backup-{timestamp}"
    )
    shutil.copy2(TARGET, backup)

    updated = source.replace(OLD_BLOCK, NEW_BLOCK, 1)
    TARGET.write_text(updated, encoding="utf-8")

    print(f"Updated : {TARGET}")
    print(f"Backup  : {backup}")
    print("Fix     : rawText sekarang didefinisikan sebelum JSX")


if __name__ == "__main__":
    main()
