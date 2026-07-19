const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function withProtocol(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;

  const localLike = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)(:\d+)?(\/|$)/i.test(trimmed);
  return `${localLike ? "http" : "https"}://${trimmed}`;
}

function shouldForceHttps(url: URL): boolean {
  if (url.protocol !== "http:" || LOCAL_HOSTS.has(url.hostname)) return false;

  if (process.env.NODE_ENV === "production") return true;

  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export function normalizeRuntimeBaseUrl(
  value: string | undefined | null,
  fallback = "http://localhost:8000",
): string {
  const source = withProtocol(String(value ?? "")) || fallback;

  try {
    const url = new URL(source);
    if (shouldForceHttps(url)) url.protocol = "https:";
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback.replace(/\/$/, "");
  }
}

export function getApiBaseUrl(): string {
  return normalizeRuntimeBaseUrl(
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL,
  );
}

export function getWebSocketBaseUrl(): string {
  return normalizeRuntimeBaseUrl(
    process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL,
  );
}

const MANAGED_FILE_PREFIXES = [
  "/uploads/",
  "/api/v1/files/private/",
];

function isManagedDashAiFilePath(pathname: string): boolean {
  return MANAGED_FILE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function joinRuntimeFilePath(pathname: string, search = "", hash = ""): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getApiBaseUrl()}${normalizedPath}${search}${hash}`;
}

export function normalizeRuntimeFileUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);

      // Product/company/employee images may have been stored with an older
      // Railway origin. Uploaded DashAI files are always served by the active
      // API service, so rebase only managed file paths to the current API URL.
      if (isManagedDashAiFilePath(url.pathname)) {
        return joinRuntimeFilePath(url.pathname, url.search, url.hash);
      }

      if (shouldForceHttps(url)) url.protocol = "https:";
      return url.toString();
    } catch {
      return raw;
    }
  }

  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (isManagedDashAiFilePath(normalizedPath)) {
    return joinRuntimeFilePath(normalizedPath);
  }

  const base = getApiBaseUrl();
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/") || raw.startsWith("api/")) return `${base}/${raw}`;
  return raw;
}
