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
            (candidate / "apps" / "backend").is_dir()
            and (candidate / "apps" / "frontend").is_dir()
            and (candidate / "docker-compose.yml").is_file()
        ):
            return candidate

    raise FileNotFoundError(
        "Root DashAI tidak ditemukan. "
        "Jalankan dari folder yang memiliki apps/ dan docker-compose.yml."
    )


def main() -> None:
    project_root = find_project_root()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = project_root / ".problem7-backups" / stamp

    installed = 0

    for source in sorted(PAYLOAD_ROOT.rglob("*")):
        if not source.is_file():
            continue

        relative = source.relative_to(PAYLOAD_ROOT)
        target = project_root / relative

        if target.exists():
            backup = backup_root / relative
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup)

        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

        if target.suffix == ".sh":
            target.chmod(0o755)

        print(f"Installed: {relative}")
        installed += 1

    print()
    print(f"Installed files: {installed}")
    print(f"Backup: {backup_root}")
    print()
    print(
        "Run: powershell -ExecutionPolicy Bypass "
        "-File .\\run_problem7.ps1"
    )


if __name__ == "__main__":
    main()
