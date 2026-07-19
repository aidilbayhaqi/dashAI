import { api } from "@/lib/api";
import { getApiBaseUrl, normalizeRuntimeFileUrl } from "@/lib/runtime-url";

export type UploadContext =
  | "product-photo"
  | "company-logo"
  | "employee-photo"
  | "transaction-proof"
  | "general";

export type FileVisibility = "public" | "private";

export type UploadedFileResponse = {
  message: string;
  filename: string;
  original_filename: string;
  content_type: string | null;
  size: number;
  context: UploadContext;
  company_id: string;
  visibility: FileVisibility;
  is_public: boolean;
  path: string;
  url: string;
  file_url: string;
};

export type UploadFileInput = {
  file: File;
  context: UploadContext;
  companyId?: string | null;
};

const PRIVATE_FILE_PREFIX = "/api/v1/files/private/";
const PUBLIC_UPLOAD_PREFIX = "/uploads/public/";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export { getApiBaseUrl };

function getUrlPath(value: string): string {
  try {
    return new URL(value, getApiBaseUrl()).pathname;
  } catch {
    return value;
  }
}

export function normalizeFileUrl(value: unknown): string {
  return normalizeRuntimeFileUrl(value);
}

export function isPrivateFileUrl(value: unknown): boolean {
  if (!hasValue(value)) return false;

  return getUrlPath(String(value).trim()).startsWith(PRIVATE_FILE_PREFIX);
}

export function isPublicUploadUrl(value: unknown): boolean {
  if (!hasValue(value)) return false;

  return getUrlPath(String(value).trim()).startsWith(PUBLIC_UPLOAD_PREFIX);
}

export function isPreviewableImage(value: unknown): boolean {
  if (!hasValue(value)) return false;

  const normalized = getUrlPath(String(value).trim()).toLowerCase();

  return (
    normalized.startsWith("data:image/") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".gif")
  );
}

export function extractUploadedFileUrl(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const record = data as Record<string, unknown>;
  const candidate =
    record.url ??
    record.file_url ??
    record.fileUrl ??
    record.path ??
    record.location ??
    record.public_url ??
    record.publicUrl ??
    record.attachment_url ??
    record.data;

  if (typeof candidate === "string") {
    return normalizeFileUrl(candidate);
  }

  if (candidate && typeof candidate === "object") {
    return extractUploadedFileUrl(candidate);
  }

  return "";
}

export async function uploadFile({
  file,
  context,
  companyId,
}: UploadFileInput): Promise<UploadedFileResponse> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("context", context);

  if (companyId?.trim()) {
    formData.append("company_id", companyId.trim());
  }

  const response = await api.post<UploadedFileResponse>(
    "/api/v1/files/upload",
    formData
  );

  const uploadedFile = response.data;

  if (!uploadedFile?.url || !uploadedFile?.filename) {
    throw new Error("Response upload file tidak valid.");
  }

  return {
    ...uploadedFile,
    url: normalizeFileUrl(uploadedFile.url),
    path: normalizeFileUrl(uploadedFile.path),
    file_url: normalizeFileUrl(uploadedFile.file_url),
  };
}

export async function fetchPrivateFileBlob(fileUrl: string): Promise<Blob> {
  if (!isPrivateFileUrl(fileUrl)) {
    throw new Error("URL tersebut bukan file private DashAI.");
  }

  const response = await api.get<Blob>(normalizeFileUrl(fileUrl), {
    responseType: "blob",
  });

  return response.data;
}

export async function createAuthenticatedFileObjectUrl(
  fileUrl: string
): Promise<string> {
  const normalizedUrl = normalizeFileUrl(fileUrl);

  if (!normalizedUrl) return "";

  if (!isPrivateFileUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  const blob = await fetchPrivateFileBlob(normalizedUrl);

  return URL.createObjectURL(blob);
}

export function revokeAuthenticatedFileObjectUrl(objectUrl: string): void {
  if (objectUrl.startsWith("blob:")) {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function downloadAuthenticatedFile(
  fileUrl: string,
  preferredFilename?: string
): Promise<void> {
  const normalizedUrl = normalizeFileUrl(fileUrl);

  if (!normalizedUrl) {
    throw new Error("URL file tidak tersedia.");
  }

  const blob = isPrivateFileUrl(normalizedUrl)
    ? await fetchPrivateFileBlob(normalizedUrl)
    : await fetch(normalizedUrl, {
        credentials: "include",
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Gagal mengambil file (${response.status}).`);
        }

        return response.blob();
      });

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = preferredFilename?.trim() || getFilenameFromUrl(normalizedUrl);
  anchor.rel = "noopener";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

export function getFilenameFromUrl(fileUrl: string): string {
  const path = getUrlPath(fileUrl);
  const filename = path.split("/").filter(Boolean).at(-1);

  if (!filename) return "download";

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
}
