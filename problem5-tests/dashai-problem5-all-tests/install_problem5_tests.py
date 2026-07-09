from __future__ import annotations

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
            candidate / "apps" / "backend" / "src" / "tests"
        ).is_dir():
            return candidate

    raise FileNotFoundError(
        "Root project DashAI tidak ditemukan. Jalankan installer "
        "dari folder yang memiliki apps/backend dan apps/frontend."
    )


def main() -> None:
    project_root = find_project_root()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = (
        project_root / ".problem5-test-backups" / timestamp
    )

    source_tests = (
        PAYLOAD_ROOT
        / "apps"
        / "backend"
        / "src"
        / "tests"
    )
    target_tests = (
        project_root
        / "apps"
        / "backend"
        / "src"
        / "tests"
    )

    installed = 0

    for source in sorted(source_tests.glob("*.py")):
        target = target_tests / source.name

        if target.exists():
            relative = target.relative_to(project_root)
            backup = backup_root / relative
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup)

        shutil.copy2(source, target)
        print(f"Installed: {target.relative_to(project_root)}")
        installed += 1

    runner_source = PACKAGE_ROOT / "run_problem5_tests.ps1"
    runner_target = project_root / "run_problem5_tests.ps1"

    if runner_target.exists():
        backup = (
            backup_root
            / runner_target.relative_to(project_root)
        )
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(runner_target, backup)

    shutil.copy2(runner_source, runner_target)

    print()
    print(f"Installed test files: {installed}")
    print(f"Runner: {runner_target}")
    print(f"Backup: {backup_root}")
    print()
    print("Run:")
    print(
        "powershell -ExecutionPolicy Bypass "
        "-File .\\run_problem5_tests.ps1"
    )


if __name__ == "__main__":
    main()
