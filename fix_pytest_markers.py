from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "apps" / "backend" / "pytest.ini"

REQUIRED_MARKERS = {
    "static": "Static contract and source-structure tests.",
    "unit": "Fast isolated unit tests.",
    "integration": "Tests requiring database, Redis, or live services.",
    "live": "Tests against running application services.",
    "auth": "Authentication and session tests.",
    "security": "Security, authorization, and tenant-isolation tests.",
    "jwt": "JWT encoding, decoding, and token validation tests.",
    "database": "Database and migration tests.",
    "redis": "Redis-backed behavior tests.",
    "slow": "Long-running tests.",
}


def marker_name(line: str) -> str | None:
    stripped = line.strip()

    if not stripped or stripped.startswith(("#", ";")):
        return None

    if ":" not in stripped:
        return None

    name = stripped.split(":", 1)[0].strip()
    return name or None


def main() -> None:
    if not TARGET.exists():
        raise FileNotFoundError(
            f"pytest.ini tidak ditemukan: {TARGET}"
        )

    original = TARGET.read_text(encoding="utf-8")
    lines = original.splitlines()

    pytest_section_index: int | None = None
    markers_index: int | None = None
    section_end = len(lines)

    for index, line in enumerate(lines):
        stripped = line.strip()

        if stripped == "[pytest]":
            pytest_section_index = index
            continue

        if pytest_section_index is not None and index > pytest_section_index:
            if stripped.startswith("[") and stripped.endswith("]"):
                section_end = index
                break

            if stripped.startswith("markers") and "=" in stripped:
                markers_index = index

    if pytest_section_index is None:
        raise RuntimeError(
            "Section [pytest] tidak ditemukan di pytest.ini."
        )

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = TARGET.with_name(
        f"{TARGET.name}.backup-{timestamp}"
    )
    shutil.copy2(TARGET, backup)

    if markers_index is None:
        insertion = [
            "markers =",
            *[
                f"    {name}: {description}"
                for name, description in REQUIRED_MARKERS.items()
            ],
        ]

        lines[section_end:section_end] = insertion
    else:
        marker_block_end = markers_index + 1

        while marker_block_end < section_end:
            candidate = lines[marker_block_end]

            if candidate.startswith((" ", "\t")) or not candidate.strip():
                marker_block_end += 1
                continue

            break

        existing_names: set[str] = set()

        for line in lines[markers_index + 1 : marker_block_end]:
            name = marker_name(line)

            if name:
                existing_names.add(name)

        missing_lines = [
            f"    {name}: {description}"
            for name, description in REQUIRED_MARKERS.items()
            if name not in existing_names
        ]

        lines[marker_block_end:marker_block_end] = missing_lines

    updated = "\n".join(lines).rstrip() + "\n"
    TARGET.write_text(updated, encoding="utf-8")

    print(f"Updated : {TARGET}")
    print(f"Backup  : {backup}")
    print("Registered markers:")

    for name in REQUIRED_MARKERS:
        print(f"- {name}")


if __name__ == "__main__":
    main()
