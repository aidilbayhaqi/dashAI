from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "apps" / "frontend"

WORKSPACE = FRONTEND / "pnpm-workspace.yaml"
DOCKERFILE_DEV = FRONTEND / "Dockerfile.dev"
DOCKERIGNORE = FRONTEND / ".dockerignore"
DOCKERFILE_DEV_IGNORE = FRONTEND / "Dockerfile.dev.dockerignore"

LEGACY_IGNORE_NAMES = [
    FRONTEND / ".Dockerignore",
    FRONTEND / "dockerignore",
]

WORKSPACE_CONTENT = """packages:
  - "."

allowBuilds:
  core-js: true
  sharp: true
  unrs-resolver: true
"""

DOCKERIGNORE_CONTENT = """node_modules
.next
.pnpm-store
out
dist
coverage
.turbo
.vercel

.env
.env.*
!.env.example

*.log
*.tmp
*.temp
*.cache
*.backup-*
*.bak
*.zip

problem-*
.problem*-backups

.vscode
.idea
.DS_Store
Thumbs.db
.git
"""

DOCKERFILE_DEV_CONTENT = """FROM node:22-alpine

RUN apk add --no-cache libc6-compat

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \\
    && corepack prepare pnpm@11.5.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN echo "=== NODE VERSION ===" \\
    && node --version \\
    && echo "=== PNPM VERSION ===" \\
    && pnpm --version \\
    && echo "=== PNPM WORKSPACE ===" \\
    && cat pnpm-workspace.yaml \\
    && echo "=== INSTALL DEPENDENCIES ===" \\
    && PNPM_CONFIG_STRICT_DEP_BUILDS=false pnpm install --frozen-lockfile \\
    && echo "=== APPROVE DEPENDENCY BUILDS ===" \\
    && pnpm approve-builds core-js sharp unrs-resolver \\
    && echo "=== REBUILD APPROVED DEPENDENCIES ===" \\
    && pnpm rebuild core-js sharp unrs-resolver

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
"""


def backup(path: Path, backup_root: Path) -> None:
    if not path.exists():
        return

    relative = path.relative_to(ROOT)
    destination = backup_root / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)


def main() -> None:
    if not (FRONTEND / "package.json").is_file():
        raise FileNotFoundError(
            "Jalankan script dari root DashAI yang memiliki "
            "apps/frontend/package.json."
        )

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = ROOT / ".problem7-backups" / f"pnpm-fix-{timestamp}"

    targets = [
        WORKSPACE,
        DOCKERFILE_DEV,
        DOCKERIGNORE,
        DOCKERFILE_DEV_IGNORE,
        *LEGACY_IGNORE_NAMES,
    ]

    for target in targets:
        backup(target, backup_root)

    for legacy in LEGACY_IGNORE_NAMES:
        if legacy.exists():
            legacy.unlink()
            print(f"Removed legacy file: {legacy.relative_to(ROOT)}")

    WORKSPACE.write_text(WORKSPACE_CONTENT, encoding="utf-8")
    DOCKERFILE_DEV.write_text(DOCKERFILE_DEV_CONTENT, encoding="utf-8")
    DOCKERIGNORE.write_text(DOCKERIGNORE_CONTENT, encoding="utf-8")
    DOCKERFILE_DEV_IGNORE.write_text(
        DOCKERIGNORE_CONTENT,
        encoding="utf-8",
    )

    print()
    print("Updated files:")
    print(f"- {WORKSPACE.relative_to(ROOT)}")
    print(f"- {DOCKERFILE_DEV.relative_to(ROOT)}")
    print(f"- {DOCKERIGNORE.relative_to(ROOT)}")
    print(f"- {DOCKERFILE_DEV_IGNORE.relative_to(ROOT)}")
    print()
    print(f"Backup: {backup_root}")
    print()
    print("Next command:")
    print(
        "docker build --no-cache --progress=plain "
        "-f .\\apps\\frontend\\Dockerfile.dev "
        "-t dashai-frontend-dev-fixed "
        ".\\apps\\frontend"
    )


if __name__ == "__main__":
    main()
