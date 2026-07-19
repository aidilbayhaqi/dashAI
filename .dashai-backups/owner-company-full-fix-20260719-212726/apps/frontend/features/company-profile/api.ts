import { api } from "@/lib/api";
import { isEndpointFallbackError } from "@/lib/api-error";
import { getCurrentCompanyId } from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";

export type CompanyProfileRow = Record<string, unknown>;

export type CompanyProfilePayload = {
  name?: string;
  legal_name?: string;
  business_name?: string;
  legal_no?: string;
  tax_number?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
};

export type BranchPayload = {
  name?: string;
  code?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  is_active?: boolean;
};

export type CompanyProfileData = {
  user: CompanyProfileRow | null;
  company: CompanyProfileRow | null;
  companyId?: string;
  branches: CompanyProfileRow[];
};

type ApiListResponse = {
  data?: unknown;
  items?: unknown;
  results?: unknown;
  rows?: unknown;
  user?: unknown;
  company?: unknown;
};

function normalizeRows(data: unknown): CompanyProfileRow[] {
  if (Array.isArray(data)) return data as CompanyProfileRow[];

  if (!data || typeof data !== "object") return [];

  const record = data as ApiListResponse;

  if (Array.isArray(record.data)) return record.data as CompanyProfileRow[];
  if (Array.isArray(record.items)) return record.items as CompanyProfileRow[];
  if (Array.isArray(record.results)) return record.results as CompanyProfileRow[];
  if (Array.isArray(record.rows)) return record.rows as CompanyProfileRow[];

  if (
    record.data &&
    typeof record.data === "object" &&
    Array.isArray((record.data as ApiListResponse).items)
  ) {
    return (record.data as ApiListResponse).items as CompanyProfileRow[];
  }

  if (
    record.data &&
    typeof record.data === "object" &&
    Array.isArray((record.data as ApiListResponse).rows)
  ) {
    return (record.data as ApiListResponse).rows as CompanyProfileRow[];
  }

  return [];
}

function normalizeObject(data: unknown): CompanyProfileRow | null {
  if (!data || typeof data !== "object") return null;

  const record = data as ApiListResponse;

  if (
    record.data &&
    typeof record.data === "object" &&
    !Array.isArray(record.data)
  ) {
    return record.data as CompanyProfileRow;
  }

  if (
    record.user &&
    typeof record.user === "object" &&
    !Array.isArray(record.user)
  ) {
    return record.user as CompanyProfileRow;
  }

  if (
    record.company &&
    typeof record.company === "object" &&
    !Array.isArray(record.company)
  ) {
    return record.company as CompanyProfileRow;
  }

  return data as CompanyProfileRow;
}

function pickString(row: CompanyProfileRow | null | undefined, keys: string[]) {
  if (!row) return "";

  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function cleanPayload<T extends Record<string, unknown>>(payload: T) {
  const cleaned: Record<string, unknown> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;

    if (typeof value === "string") {
      const trimmed = value.trim();
      cleaned[key] = trimmed === "" ? null : trimmed;
      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
}

async function requestFirst<T>(requests: Array<() => Promise<T>>, fallback: T) {
  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      if (!isEndpointFallbackError(error)) {
        throw error;
      }
    }
  }

  return fallback;
}

export function getEffectiveCompanyId() {
  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  if (currentCompanyId) return currentCompanyId;

  if (selectedCompanyId && selectedCompanyId !== "all") {
    return selectedCompanyId;
  }

  return undefined;
}

export async function getCurrentUserProfile() {
  return requestFirst<CompanyProfileRow | null>(
    [
      async () => normalizeObject((await api.get("/api/v1/auth/me")).data),
      async () => normalizeObject((await api.get("/api/v1/users/me")).data),
      async () => normalizeObject((await api.get("/api/v1/me")).data),
      async () => normalizeObject((await api.get("/api/v1/profile")).data),
    ],
    null
  );
}

export async function getCompanyById(companyId: string) {
  return requestFirst<CompanyProfileRow | null>(
    [
      async () =>
        normalizeObject((await api.get(`/api/v1/companies/${companyId}`)).data),
      async () =>
        normalizeObject(
          (
            await api.get("/api/v1/company", {
              params: {
                company_id: companyId,
              },
            })
          ).data
        ),
      async () =>
        normalizeObject(
          (
            await api.get("/api/v1/company/profile", {
              params: {
                company_id: companyId,
              },
            })
          ).data
        ),
    ],
    null
  );
}

export async function getCompanyBranches(companyId: string) {
  return requestFirst<CompanyProfileRow[]>(
    [
      async () =>
        normalizeRows((await api.get(`/api/v1/companies/${companyId}/branches`)).data),
      async () =>
        normalizeRows(
          (
            await api.get("/api/v1/branches", {
              params: {
                company_id: companyId,
                limit: 100,
              },
            })
          ).data
        ),
      async () =>
        normalizeRows(
          (
            await api.get("/api/v1/company/branches", {
              params: {
                company_id: companyId,
                limit: 100,
              },
            })
          ).data
        ),
      async () =>
        normalizeRows(
          (
            await api.get("/api/v1/admin/branches", {
              params: {
                company_id: companyId,
                limit: 100,
              },
            })
          ).data
        ),
    ],
    []
  );
}

export async function getCompanyProfileData(): Promise<CompanyProfileData> {
  const user = await getCurrentUserProfile();

  const companyIdFromUser = pickString(user, [
    "company_id",
    "companyId",
    "current_company_id",
  ]);

  const companyId = companyIdFromUser || getEffectiveCompanyId();

  const company = companyId ? await getCompanyById(companyId) : null;

  const resolvedCompanyId =
    companyId || pickString(company, ["id", "uuid", "company_id"]);

  const branches = resolvedCompanyId
    ? await getCompanyBranches(resolvedCompanyId)
    : [];

  return {
    user,
    company,
    companyId: resolvedCompanyId || undefined,
    branches,
  };
}

export async function createCompanyProfile(payload: CompanyProfilePayload) {
  const body = cleanPayload(payload);

  return requestFirst<CompanyProfileRow | null>(
    [
      async () => normalizeObject((await api.post("/api/v1/companies", body)).data),
      async () => normalizeObject((await api.post("/api/v1/company", body)).data),
    ],
    null
  );
}

export async function updateCompanyProfile(
  companyId: string,
  payload: CompanyProfilePayload
) {
  const body = cleanPayload(payload);

  return requestFirst<CompanyProfileRow | null>(
    [
      async () =>
        normalizeObject((await api.patch(`/api/v1/companies/${companyId}`, body)).data),
      async () =>
        normalizeObject((await api.put(`/api/v1/companies/${companyId}`, body)).data),
      async () =>
        normalizeObject(
          (
            await api.patch("/api/v1/company", body, {
              params: {
                company_id: companyId,
              },
            })
          ).data
        ),
      async () =>
        normalizeObject(
          (
            await api.patch("/api/v1/company/profile", body, {
              params: {
                company_id: companyId,
              },
            })
          ).data
        ),
    ],
    null
  );
}

export async function createCompanyBranch(
  companyId: string,
  payload: BranchPayload
) {
  const body = cleanPayload({
    ...payload,
    company_id: companyId,
  });

  return requestFirst<CompanyProfileRow | null>(
    [
      async () =>
        normalizeObject(
          (await api.post(`/api/v1/companies/${companyId}/branches`, body)).data
        ),
      async () => normalizeObject((await api.post("/api/v1/branches", body)).data),
      async () =>
        normalizeObject((await api.post("/api/v1/company/branches", body)).data),
      async () =>
        normalizeObject((await api.post("/api/v1/admin/branches", body)).data),
    ],
    null
  );
}

export function getProfileDisplayValue(
  row: CompanyProfileRow | null | undefined,
  keys: string[],
  fallback = "-"
) {
  return pickString(row, keys) || fallback;
}