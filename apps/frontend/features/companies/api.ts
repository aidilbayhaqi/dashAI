import { api } from "@/lib/api";

import type {
  CompanyDetail,
  CompanyListItem,
  CompanyUpdateInput,
  ProvisionCompanyInput,
} from "./types";

function optionalString(
  value: string | null | undefined
): string | undefined {
  const normalized = String(
    value ?? ""
  ).trim();

  return normalized || undefined;
}

function nullableString(
  value: string | null | undefined
): string | null {
  const normalized = String(
    value ?? ""
  ).trim();

  return normalized || null;
}

function extractRows<T>(
  payload: unknown
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return [];
  }

  const record = payload as Record<
    string,
    unknown
  >;

  const candidates = [
    record.data,
    record.items,
    record.rows,
    record.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

function prepareProvisionPayload(
  payload: ProvisionCompanyInput
): ProvisionCompanyInput {
  return {
    company: {
      ...payload.company,

      name:
        payload.company.name.trim(),

      legal_name: optionalString(
        payload.company.legal_name
      ),

      tax_number: optionalString(
        payload.company.tax_number
      ),

      email: optionalString(
        payload.company.email
      ),

      phone: optionalString(
        payload.company.phone
      ),

      website: optionalString(
        payload.company.website
      ),

      industry: optionalString(
        payload.company.industry
      ),

      company_size: optionalString(
        payload.company.company_size
      ),

      address_line: optionalString(
        payload.company.address_line
      ),

      city: optionalString(
        payload.company.city
      ),

      province: optionalString(
        payload.company.province
      ),

      country:
        payload.company.country.trim() ||
        "Indonesia",

      postal_code: optionalString(
        payload.company.postal_code
      ),

      default_currency:
        payload.company.default_currency
          .trim()
          .toUpperCase() || "IDR",

      timezone:
        payload.company.timezone.trim() ||
        "Asia/Jakarta",

      logo_url: optionalString(
        payload.company.logo_url
      ),
    },

    owner: {
      ...payload.owner,

      full_name:
        payload.owner.full_name.trim(),

      email:
        payload.owner.email
          .trim()
          .toLowerCase(),

      phone: optionalString(
        payload.owner.phone
      ),

      avatar_url: optionalString(
        payload.owner.avatar_url
      ),

      job_title: optionalString(
        payload.owner.job_title
      ),

      department_name:
        optionalString(
          payload.owner.department_name
        ),
    },

    users: payload.users.map(
      (user) => ({
        ...user,

        full_name:
          user.full_name.trim(),

        email:
          user.email
            .trim()
            .toLowerCase(),

        phone: optionalString(
          user.phone
        ),

        avatar_url: optionalString(
          user.avatar_url
        ),

        job_title: optionalString(
          user.job_title
        ),

        department_name:
          optionalString(
            user.department_name
          ),
      })
    ),

    branches: payload.branches.map(
      (branch) => ({
        ...branch,

        code:
          branch.code
            .trim()
            .toUpperCase(),

        name:
          branch.name.trim(),

        email: optionalString(
          branch.email
        ),

        phone: optionalString(
          branch.phone
        ),

        address_line: optionalString(
          branch.address_line
        ),

        city: optionalString(
          branch.city
        ),

        province: optionalString(
          branch.province
        ),

        country:
          branch.country.trim() ||
          "Indonesia",

        postal_code: optionalString(
          branch.postal_code
        ),
      })
    ),
  };
}

function prepareCompanyUpdate(
  payload: CompanyUpdateInput
): CompanyUpdateInput {
  return {
    name: payload.name.trim(),

    legal_name: nullableString(
      payload.legal_name
    ),

    tax_number: nullableString(
      payload.tax_number
    ),

    email: nullableString(
      payload.email
    ),

    phone: nullableString(
      payload.phone
    ),

    website: nullableString(
      payload.website
    ),

    industry: nullableString(
      payload.industry
    ),

    company_size: nullableString(
      payload.company_size
    ),

    address_line: nullableString(
      payload.address_line
    ),

    city: nullableString(
      payload.city
    ),

    province: nullableString(
      payload.province
    ),

    country:
      nullableString(
        payload.country
      ) ?? "Indonesia",

    postal_code: nullableString(
      payload.postal_code
    ),

    default_currency:
      nullableString(
        payload.default_currency
      )?.toUpperCase() ?? "IDR",

    timezone:
      nullableString(
        payload.timezone
      ) ?? "Asia/Jakarta",

    fiscal_year_start_month:
      Number(
        payload.fiscal_year_start_month ??
          1
      ),

    logo_url: nullableString(
      payload.logo_url
    ),

    status:
      payload.status ?? "active",

    is_active:
      payload.is_active ?? true,
  };
}

export async function getCompanies(): Promise<
  CompanyListItem[]
> {
  const response = await api.get(
    "/api/v1/companies"
  );

  return extractRows<CompanyListItem>(
    response.data
  );
}

export async function getCompanyDetail(
  companyId: string
): Promise<CompanyDetail> {
  const response =
    await api.get<CompanyDetail>(
      `/api/v1/companies/${companyId}/detail`
    );

  return response.data;
}

export async function updateCompany(
  companyId: string,
  payload: CompanyUpdateInput
): Promise<CompanyListItem> {
  const body =
    prepareCompanyUpdate(payload);

  const response =
    await api.patch<CompanyListItem>(
      `/api/v1/companies/${companyId}`,
      body
    );

  return response.data;
}

export async function deleteCompany(
  companyId: string
): Promise<void> {
  await api.delete(
    `/api/v1/companies/${companyId}`
  );
}

export async function provisionCompany(
  payload: ProvisionCompanyInput
): Promise<CompanyDetail> {
  const body =
    prepareProvisionPayload(payload);

  const response =
    await api.post<CompanyDetail>(
      "/api/v1/companies/provision",
      body
    );

  return response.data;
}

export function getCompanyApiError(
  error: unknown
): string {
  const candidate = error as {
    message?: string;
    response?: {
      status?: number;
      data?: {
        detail?: unknown;
        message?: unknown;
      };
    };
  };

  const detail =
    candidate.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item
        ) {
          return String(
            (
              item as {
                msg?: unknown;
              }
            ).msg ??
              "Input tidak valid"
          );
        }

        return String(item);
      })
      .join(", ");
  }

  const responseMessage =
    candidate.response?.data?.message;

  if (
    typeof responseMessage === "string"
  ) {
    return responseMessage;
  }

  if (
    candidate.response?.status === 404
  ) {
    return "Company tidak ditemukan.";
  }

  if (
    candidate.response?.status === 403
  ) {
    return "Anda tidak memiliki akses ke company ini.";
  }

  return (
    candidate.message ??
    "Terjadi kesalahan pada request company."
  );
}