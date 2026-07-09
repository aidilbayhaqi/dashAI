import {
  extractUploadedFileUrl,
  isPreviewableImage as isFilePreviewableImage,
  normalizeFileUrl,
  uploadFile,
  type UploadContext,
} from "@/lib/file-access";
import { getCurrentCompanyId } from "@/lib/auth-scope";
import {
  ALL_COMPANIES_VALUE,
  getSelectedCompanyId,
} from "@/lib/company-scope";

export type UploadRecordFileOptions = {
  context?: UploadContext;
  companyId?: string | null;
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeCompanyId(value: unknown): string | undefined {
  if (!hasValue(value)) return undefined;

  const normalized = String(value).trim();

  if (!normalized || normalized === ALL_COMPANIES_VALUE) {
    return undefined;
  }

  return normalized;
}

function resolveUploadCompanyId(
  explicitCompanyId?: string | null
): string | undefined {
  const explicit = normalizeCompanyId(explicitCompanyId);

  if (explicit) return explicit;

  const selected = normalizeCompanyId(getSelectedCompanyId());

  if (selected) return selected;

  return normalizeCompanyId(getCurrentCompanyId());
}

/**
 * Compatibility alias untuk komponen lama.
 */
export function normalizeUploadedUrl(value: unknown): string {
  return normalizeFileUrl(value);
}

/**
 * Compatibility helper untuk response upload lama maupun baru.
 */
export function extractUploadedUrl(data: unknown): string {
  return extractUploadedFileUrl(data);
}

export function isPreviewableImage(value: string): boolean {
  return isFilePreviewableImage(value);
}

/**
 * Upload file melalui endpoint resmi DashAI.
 *
 * Signature lama `uploadRecordFile(file)` tetap didukung.
 * Pemanggil baru dapat mengirim context dan companyId agar policy storage
 * public/private sesuai dengan jenis field yang sedang di-upload.
 */
export async function uploadRecordFile(
  file: File,
  options: UploadRecordFileOptions = {}
): Promise<string> {
  const uploadedFile = await uploadFile({
    file,
    context: options.context ?? "general",
    companyId: resolveUploadCompanyId(options.companyId),
  });

  const uploadedUrl = extractUploadedFileUrl(uploadedFile);

  if (!uploadedUrl) {
    throw new Error("Backend tidak mengembalikan URL file yang valid.");
  }

  return uploadedUrl;
}
