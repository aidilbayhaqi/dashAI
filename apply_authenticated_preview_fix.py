from __future__ import annotations

import re
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
    / "record-modal.tsx"
)

IMPORT_LINE = (
    'import { AuthenticatedFilePreview } '
    'from "@/components/files/authenticated-file-preview";'
)


def backup_file(path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = path.with_name(f"{path.name}.backup-{timestamp}")
    shutil.copy2(path, backup)
    return backup


def ensure_import(source: str) -> tuple[str, bool]:
    if (
        "@/components/files/authenticated-file-preview"
        in source
    ):
        return source, False

    import_pattern = re.compile(
        r'(^import[\s\S]*?;\s*$)',
        re.MULTILINE,
    )
    imports = list(import_pattern.finditer(source))

    if not imports:
        raise RuntimeError(
            "Tidak menemukan blok import di record-modal.tsx."
        )

    last_import = imports[-1]
    insert_at = last_import.end()

    updated = (
        source[:insert_at]
        + "\n"
        + IMPORT_LINE
        + source[insert_at:]
    )
    return updated, True


def extract_jsx_attribute(
    attrs: str,
    attribute: str,
) -> str | None:
    expression_pattern = re.compile(
        rf'\b{re.escape(attribute)}\s*=\s*'
        r'(\{(?:[^{}]|\{[^{}]*\})*\})',
        re.DOTALL,
    )
    expression_match = expression_pattern.search(attrs)

    if expression_match:
        return expression_match.group(1).strip()

    quoted_pattern = re.compile(
        rf'\b{re.escape(attribute)}\s*=\s*'
        r'("[^"]*"|\'[^\']*\')',
        re.DOTALL,
    )
    quoted_match = quoted_pattern.search(attrs)

    if quoted_match:
        return quoted_match.group(1).strip()

    return None


def replace_image_tag(match: re.Match[str]) -> str:
    whole = match.group(0)
    attrs = match.group("attrs")

    # Jangan menyentuh elemen yang sudah dimigrasikan atau image tanpa src.
    if "AuthenticatedFilePreview" in whole:
        return whole

    src = extract_jsx_attribute(attrs, "src")
    if not src:
        return whole

    alt = extract_jsx_attribute(attrs, "alt") or '"File preview"'
    class_name = (
        extract_jsx_attribute(attrs, "className")
        or '"h-full w-full object-cover"'
    )

    indent_match = re.match(r"^[ \t]*", whole)
    indent = indent_match.group(0) if indent_match else ""

    return (
        f"{indent}<AuthenticatedFilePreview\n"
        f"{indent}  src={src}\n"
        f"{indent}  alt={alt}\n"
        f"{indent}  className={class_name}\n"
        f"{indent}/>"
    )


def replace_images(source: str) -> tuple[str, int]:
    # Menangani <img ... /> dan <img ...></img>.
    pattern = re.compile(
        r'(?P<indent>^[ \t]*)'
        r'<img(?P<attrs>[\s\S]*?)'
        r'(?:\/>|>\s*<\/img>)',
        re.MULTILINE,
    )

    count = 0

    def replacer(match: re.Match[str]) -> str:
        nonlocal count
        replacement = replace_image_tag(match)

        if replacement != match.group(0):
            count += 1

        return replacement

    return pattern.sub(replacer, source), count


def main() -> None:
    if not TARGET.exists():
        raise FileNotFoundError(
            f"File tidak ditemukan: {TARGET}"
        )

    original = TARGET.read_text(encoding="utf-8")
    updated, import_added = ensure_import(original)
    updated, replaced_count = replace_images(updated)

    if updated == original:
        print(
            "Tidak ada perubahan. "
            "Import sudah ada dan tidak ditemukan <img> "
            "yang perlu dimigrasikan."
        )
        return

    backup = backup_file(TARGET)
    TARGET.write_text(updated, encoding="utf-8")

    print(f"Updated : {TARGET}")
    print(f"Backup  : {backup}")
    print(f"Import added : {import_added}")
    print(f"Image tags replaced : {replaced_count}")

    if replaced_count == 0:
        print(
            "\nPERINGATAN: import berhasil ditambahkan, "
            "tetapi tidak ada tag <img> yang ditemukan. "
            "Periksa apakah preview berada di file lain."
        )


if __name__ == "__main__":
    main()
