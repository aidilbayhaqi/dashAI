import axios from "axios";


type FastApiValidationItem = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};


type ApiErrorPayload = {
  detail?: string | FastApiValidationItem[] | Record<string, unknown>;
  message?: string;
  error?: string;
};


export function getApiStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}


export function isEndpointFallbackError(error: unknown): boolean {
  const status = getApiStatus(error);
  return status === 404 || status === 405 || status === 422;
}


function formatValidationDetail(items: FastApiValidationItem[]): string {
  return items
    .map((item) => {
      const field = item.loc
        ?.filter((part) => part !== "body" && part !== "query")
        .join(".");
      return [field, item.msg].filter(Boolean).join(": ");
    })
    .filter(Boolean)
    .join("; ");
}


export function getApiErrorMessage(
  error: unknown,
  fallback = "Terjadi kesalahan saat memproses permintaan.",
): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;
    const detail = payload?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail)) {
      const formatted = formatValidationDetail(detail);
      if (formatted) return formatted;
    }

    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }

    if (error.code === "ECONNABORTED") {
      return "Permintaan melewati batas waktu. Periksa koneksi dan coba lagi.";
    }

    if (!error.response) {
      return "Backend tidak dapat dijangkau. Periksa container API dan koneksi jaringan.";
    }

    return error.message || fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
