from __future__ import annotations

import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

TARGET = Path("apps/frontend/components/modules/record-modal.tsx")

IMPORT_BLOCK = '''import type { UploadContext } from "@/lib/file-access";
import {
  isPreviewableImage,
  uploadRecordFile,
} from "./record-modal/upload";
'''

CONTEXT_HELPER = '''function getUploadContext(
  fieldKey: string,
  moduleKey?: string
): UploadContext {
  const normalizedField = fieldKey
    .trim()
    .toLowerCase();

  const normalizedModule = String(
    moduleKey ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    normalizedField === "logo_url" ||
    normalizedField === "company_logo_url"
  ) {
    return "company-logo";
  }

  if (
    normalizedModule.includes("employee") ||
    normalizedModule.includes("attendance") ||
    normalizedModule.includes("payroll") ||
    normalizedModule.includes("leave") ||
    normalizedModule.includes("kpi")
  ) {
    if (
      normalizedField.includes("photo") ||
      normalizedField.includes("avatar") ||
      normalizedField.includes("image")
    ) {
      return "employee-photo";
    }
  }

  if (
    [
      "avatar_url",
      "employee_photo_url",
      "employee_image_url",
    ].includes(normalizedField)
  ) {
    return "employee-photo";
  }

  if (
    normalizedModule.includes("transaction") ||
    normalizedModule.includes("invoice") ||
    normalizedModule.includes("tax")
  ) {
    if (
      normalizedField.includes("attachment") ||
      normalizedField.includes("proof") ||
      normalizedField.includes("receipt") ||
      normalizedField.includes("evidence") ||
      normalizedField.includes("document")
    ) {
      return "transaction-proof";
    }
  }

  if (
    [
      "attachment_url",
      "proof_url",
      "receipt_url",
      "evidence_url",
      "payment_proof_url",
      "transaction_proof_url",
    ].includes(normalizedField)
  ) {
    return "transaction-proof";
  }

  if (
    [
      "image_url",
      "photo_url",
      "product_image_url",
      "thumbnail_url",
    ].includes(normalizedField)
  ) {
    return "product-photo";
  }

  return "general";
}

'''

NEW_UPLOAD_CALL = '''const url = await uploadRecordFile(file, {
        context: getUploadContext(
          field.key,
          moduleKey
        ),
        companyId: String(
          values.company_id ?? ""
        ).trim() || undefined,
      });'''


def fail(message: str) -> int:
    print(f"❌ {message}", file=sys.stderr)
    return 1


def main() -> int:
    if not TARGET.exists():
        return fail(f"File tidak ditemukan: {TARGET}")

    source = TARGET.read_text(encoding="utf-8")

    if (
        'from "./record-modal/upload"' in source
        and "getUploadContext(" in source
        and "context: getUploadContext(" in source
    ):
        print("✅ record-modal.tsx sudah menggunakan upload helper baru.")
        return 0

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = TARGET.with_name(f"{TARGET.name}.backup-{timestamp}")
    shutil.copy2(TARGET, backup)

    try:
        updated = source

        if 'from "./record-modal/upload"' not in updated:
            marker = 'import { getSelectedCompanyId } from "@/lib/company-scope";\n'

            if marker not in updated:
                raise RuntimeError(
                    "Import company-scope tidak ditemukan; file mungkin sudah berbeda."
                )

            updated = updated.replace(
                marker,
                marker + IMPORT_BLOCK,
                1,
            )

        local_upload_pattern = re.compile(
            r"\nfunction isPreviewableImage\(value: string\) \{.*?\n\}\n\n"
            r"async function uploadRecordFile\(file: File\) \{.*?\n\}\n\n"
            r"(?=export function RecordModal)",
            re.DOTALL,
        )

        if local_upload_pattern.search(updated):
            updated = local_upload_pattern.sub(
                "\n" + CONTEXT_HELPER,
                updated,
                count=1,
            )
        elif "function getUploadContext(" not in updated:
            export_marker = "export function RecordModal({"

            if export_marker not in updated:
                raise RuntimeError("Deklarasi RecordModal tidak ditemukan.")

            updated = updated.replace(
                export_marker,
                CONTEXT_HELPER + export_marker,
                1,
            )

        old_call = "const url = await uploadRecordFile(file);"

        if old_call in updated:
            updated = updated.replace(
                old_call,
                NEW_UPLOAD_CALL,
                1,
            )
        elif "context: getUploadContext(" not in updated:
            raise RuntimeError(
                "Pemanggilan uploadRecordFile(file) tidak ditemukan."
            )

        required_fragments = (
            'from "./record-modal/upload"',
            'import type { UploadContext } from "@/lib/file-access";',
            "function getUploadContext(",
            "context: getUploadContext(",
        )

        missing = [
            fragment
            for fragment in required_fragments
            if fragment not in updated
        ]

        if missing:
            raise RuntimeError(
                "Hasil patch tidak lengkap: " + ", ".join(missing)
            )

        if "async function uploadRecordFile(file: File)" in updated:
            raise RuntimeError(
                "Fungsi upload lokal lama masih tersisa."
            )

        TARGET.write_text(updated, encoding="utf-8", newline="\n")

    except Exception as exc:
        shutil.copy2(backup, TARGET)
        return fail(
            f"Perubahan dibatalkan dan backup dipulihkan: {exc}"
        )

    print("✅ record-modal.tsx berhasil diperbarui.")
    print(f"🛡️ Backup: {backup}")
    print("Perubahan hanya menyentuh integrasi upload file.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
