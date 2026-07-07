import { api } from "@/lib/api";

type UploadResponse = Record<string, unknown>;

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getApiBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (fromEnv) return fromEnv.replace(/\/$/, "");

  return "http://localhost:8000";
}

export function normalizeUploadedUrl(value: unknown) {
  if (!hasValue(value)) return "";

  const url = String(value).trim();

  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/uploads")) {
    return `${getApiBaseUrl()}${url}`;
  }

  if (url.startsWith("uploads/")) {
    return `${getApiBaseUrl()}/${url}`;
  }

  return url;
}

function extractUploadedUrl(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const record = data as UploadResponse;

  const value =
    record.url ??
    record.file_url ??
    record.fileUrl ??
    record.path ??
    record.location ??
    record.public_url ??
    record.publicUrl ??
    record.attachment_url ??
    record.data;

  if (typeof value === "string") {
    return normalizeUploadedUrl(value);
  }

  if (value && typeof value === "object") {
    return extractUploadedUrl(value);
  }

  return "";
}

export function isPreviewableImage(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.startsWith("data:image/") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".gif") ||
    normalized.includes("/image/")
  );
}

export async function uploadRecordFile(file: File) {
  const formData = new FormData();

  formData.append("file", file);

  const endpoints = [
    "/api/v1/uploads",
    "/api/v1/upload",
    "/api/v1/files/upload",
    "/api/v1/files",
  ];

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedUrl = extractUploadedUrl(response.data);

      if (uploadedUrl) return uploadedUrl;
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("[uploadRecordFile] upload failed", lastError);

  throw new Error("Upload gagal. Pastikan endpoint upload backend tersedia.");
}