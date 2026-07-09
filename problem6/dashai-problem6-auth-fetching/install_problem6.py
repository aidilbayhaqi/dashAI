from __future__ import annotations

import re
import shutil
from datetime import datetime
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parent
PAYLOAD_ROOT = PACKAGE_ROOT / "payload"


def find_project_root() -> Path:
    candidates = [
        Path.cwd().resolve(),
        PACKAGE_ROOT.parent.resolve(),
        PACKAGE_ROOT.parent.parent.resolve(),
    ]

    for candidate in candidates:
        if (
            (candidate / "apps" / "frontend").is_dir()
            and (candidate / "apps" / "backend").is_dir()
        ):
            return candidate

    raise FileNotFoundError(
        "Root DashAI tidak ditemukan."
    )


def backup_file(
    source: Path,
    project_root: Path,
    backup_root: Path,
) -> None:
    if not source.exists():
        return

    relative = source.relative_to(project_root)
    target = backup_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def replace_token_response(
    project_root: Path,
    backup_root: Path,
) -> None:
    target = (
        project_root
        / "apps"
        / "frontend"
        / "types"
        / "backend.ts"
    )

    source = target.read_text(encoding="utf-8")

    pattern = re.compile(
        r"export type TokenResponse\s*=\s*\{"
        r"[\s\S]*?\};",
        re.MULTILINE,
    )

    replacement = (
        "export type TokenResponse = {\n"
        "  access_token: string;\n"
        "  token_type: string;\n"
        "};"
    )

    updated, count = pattern.subn(
        replacement,
        source,
        count=1,
    )

    if count != 1:
        raise RuntimeError(
            "TokenResponse tidak ditemukan "
            "di types/backend.ts."
        )

    backup_file(
        target,
        project_root,
        backup_root,
    )

    target.write_text(
        updated,
        encoding="utf-8",
    )


def main() -> None:
    project_root = find_project_root()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = (
        project_root
        / ".problem6-backups"
        / stamp
    )

    for source in sorted(PAYLOAD_ROOT.rglob("*")):
        if not source.is_file():
            continue

        relative = source.relative_to(PAYLOAD_ROOT)
        target = project_root / relative

        backup_file(
            target,
            project_root,
            backup_root,
        )

        target.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        shutil.copy2(source, target)
        print("Installed:", relative)

    replace_token_response(
        project_root,
        backup_root,
    )

    runner_source = PACKAGE_ROOT / "run_problem6_tests.ps1"
    runner_target = project_root / "run_problem6_tests.ps1"

    backup_file(
        runner_target,
        project_root,
        backup_root,
    )

    shutil.copy2(
        runner_source,
        runner_target,
    )

    print()
    print("Problem 6 installed.")
    print("Backup:", backup_root)
    print(
        "Run: powershell -ExecutionPolicy Bypass "
        "-File .\\run_problem6_tests.ps1"
    )


if __name__ == "__main__":
    main()
