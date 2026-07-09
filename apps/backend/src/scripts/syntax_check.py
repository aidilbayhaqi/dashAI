from __future__ import annotations

import sys
from pathlib import Path


ROOTS = (
    Path("src"),
    Path("migrations"),
)


def iter_python_files() -> list[Path]:
    files: list[Path] = []

    for root in ROOTS:
        if not root.exists():
            continue

        files.extend(
            path
            for path in root.rglob("*.py")
            if "__pycache__" not in path.parts
        )

    return sorted(files)


def main() -> int:
    errors: list[tuple[Path, BaseException]] = []
    files = iter_python_files()

    for path in files:
        try:
            source = path.read_text(encoding="utf-8")
            compile(source, str(path), "exec")
        except BaseException as exc:
            errors.append((path, exc))

    if errors:
        print("Python syntax check failed:\n")

        for path, error in errors:
            print(f"- {path}: {error}")

        return 1

    print(
        f"Python syntax check passed: {len(files)} files checked."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
