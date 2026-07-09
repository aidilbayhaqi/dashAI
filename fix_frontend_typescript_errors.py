from __future__ import annotations

import shutil
import sys
from datetime import datetime
from pathlib import Path


FILES = {
    "module_page": Path("apps/frontend/components/modules/module-page.tsx"),
    "admin_config": Path("apps/frontend/features/admin/config.ts"),
    "ai_config": Path("apps/frontend/features/ai-report/config.ts"),
    "finance_service": Path("apps/frontend/features/finance/service.ts"),
}


def find_project_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if all((candidate / path).exists() for path in FILES.values()):
            return candidate
    raise FileNotFoundError(
        "Root project DashAI tidak ditemukan. Jalankan script ini dari folder root project."
    )


def backup(path: Path, stamp: str) -> Path:
    target = path.with_name(f"{path.name}.backup-{stamp}")
    shutil.copy2(path, target)
    return target


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count == 0:
        if new in text:
            print(f"ℹ️  {label}: sudah diperbaiki sebelumnya")
            return text
        raise RuntimeError(f"Pola untuk {label} tidak ditemukan; file tidak diubah.")
    if count > 1:
        raise RuntimeError(
            f"Pola untuk {label} ditemukan {count} kali; dihentikan agar tidak salah ubah."
        )
    return text.replace(old, new, 1)


def patch_module_page(text: str) -> str:
    old = """                  <Icon size={24} />"""
    new = """                  {Icon ? <Icon size={24} /> : <FileText size={24} />}"""
    return replace_once(text, old, new, "fallback icon ModulePage")


def insert_form_fields_for_key(text: str, key: str) -> str:
    marker = f"  {key}: {{"
    start = text.find(marker)
    if start == -1:
        raise RuntimeError(f"Config key '{key}' tidak ditemukan.")

    next_block = text.find("\n  },", start)
    if next_block == -1:
        raise RuntimeError(f"Penutup config key '{key}' tidak ditemukan.")

    block = text[start:next_block]
    if "formFields:" in block:
        print(f"ℹ️  {key}: formFields sudah ada")
        return text

    columns_end = block.rfind("    ],")
    if columns_end == -1:
        raise RuntimeError(f"columns untuk config '{key}' tidak ditemukan.")

    insert_at = start + columns_end + len("    ],")
    return text[:insert_at] + "\n    formFields: []," + text[insert_at:]


def patch_admin_config(text: str) -> str:
    text = insert_form_fields_for_key(text, "companies")
    text = insert_form_fields_for_key(text, "users")
    return text


def patch_ai_config(text: str) -> str:
    return insert_form_fields_for_key(text, "overview")


def patch_finance_service(text: str) -> str:
    old_signature = "function getArrayByKeys(record: RawRecord, keys: string[]) {"
    new_signature = (
        "function getArrayByKeys(\n"
        "  record: RawRecord,\n"
        "  keys: string[]\n"
        "): unknown[] {"
    )
    text = replace_once(
        text,
        old_signature,
        new_signature,
        "return type getArrayByKeys",
    )

    old_nested = "      const nested = getArrayByKeys(value as RawRecord, keys);"
    new_nested = (
        "      const nested: unknown[] = getArrayByKeys(\n"
        "        value as RawRecord,\n"
        "        keys\n"
        "      );"
    )
    return replace_once(
        text,
        old_nested,
        new_nested,
        "type nested getArrayByKeys",
    )


def main() -> int:
    try:
        root = find_project_root(Path.cwd().resolve())
    except Exception as exc:
        print(f"❌ {exc}", file=sys.stderr)
        return 1

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    patchers = {
        "module_page": patch_module_page,
        "admin_config": patch_admin_config,
        "ai_config": patch_ai_config,
        "finance_service": patch_finance_service,
    }

    originals: dict[Path, str] = {}
    backups: list[Path] = []

    try:
        for name, relative_path in FILES.items():
            path = root / relative_path
            original = path.read_text(encoding="utf-8")
            originals[path] = original
            updated = patchers[name](original)

            if updated == original:
                continue

            backups.append(backup(path, stamp))
            path.write_text(updated, encoding="utf-8", newline="\n")
            print(f"✅ Diperbaiki: {relative_path}")

    except Exception as exc:
        for path, original in originals.items():
            path.write_text(original, encoding="utf-8", newline="\n")
        print(f"❌ Perubahan dibatalkan: {exc}", file=sys.stderr)
        return 1

    print("\nSelesai. Backup dibuat untuk file yang berubah:")
    for path in backups:
        print(f"  - {path.relative_to(root)}")

    print("\nValidasi berikutnya:")
    print("  docker compose exec frontend pnpm exec tsc --noEmit")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
