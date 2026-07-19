import {
  api,
} from "@/lib/api";

import {
  clearAuthSession,
  setAuthSession,
} from "@/lib/auth";

import type {
  AuthUser,
  LoginPayload,
  LoginResponse,
  RegisterCompanyOption,
  RegisterPayload,
} from "@/types/backend";


function cleanOptionalString(
  value:
    | string
    | null
    | undefined
):
  | string
  | undefined {
  const normalized =
    String(
      value ?? ""
    ).trim();

  return (
    normalized
    || undefined
  );
}


function prepareRegisterPayload(
  payload:
    RegisterPayload
): RegisterPayload {
  const commonPayload = {
    account_type:
      payload
        .account_type,

    full_name:
      payload
        .full_name
        .trim(),

    email:
      payload.email
        .trim()
        .toLowerCase(),

    phone:
      cleanOptionalString(
        payload.phone
      ),

    password:
      payload.password,

    confirm_password:
      payload
        .confirm_password,
  };

  if (
    payload.account_type
    === "company_user"
  ) {
    return {
      ...commonPayload,

      company_id:
        cleanOptionalString(
          payload.company_id
        ),

      job_title:
        cleanOptionalString(
          payload.job_title
        ),

      department_name:
        cleanOptionalString(
          payload
            .department_name
        ),
    };
  }

  return {
    ...commonPayload,

    company_name:
      cleanOptionalString(
        payload
          .company_name
      ),

    legal_name:
      cleanOptionalString(
        payload.legal_name
      ),

    company_email:
      cleanOptionalString(
        payload
          .company_email
      )?.toLowerCase(),

    company_phone:
      cleanOptionalString(
        payload
          .company_phone
      ),

    company_industry:
      cleanOptionalString(
        payload
          .company_industry
      ),

    company_size:
      cleanOptionalString(
        payload
          .company_size
      ),

    address_line:
      cleanOptionalString(
        payload
          .address_line
      ),

    city:
      cleanOptionalString(
        payload.city
      ),

    province:
      cleanOptionalString(
        payload.province
      ),

    country:
      cleanOptionalString(
        payload.country
      ) ?? "Indonesia",

    postal_code:
      cleanOptionalString(
        payload
          .postal_code
      ),
  };
}


export async function login(
  payload: LoginPayload
): Promise<LoginResponse> {
  const response =
    await api.post<
      LoginResponse
    >(
      "/api/v1/auth/login",
      payload
    );

  setAuthSession(
    response.data.token,
    response.data.user
  );

  return response.data;
}


export async function
getRegisterCompanies(
  search?: string
): Promise<
  RegisterCompanyOption[]
> {
  const response =
    await api.get<
      RegisterCompanyOption[]
    >(
      "/api/v1/auth/register/companies",
      {
        params: {
          search:
            search?.trim()
            || undefined,
        },
      }
    );

  return (
    Array.isArray(
      response.data
    )
      ? response.data
      : []
  );
}


export async function register(
  payload:
    RegisterPayload
): Promise<LoginResponse> {
  const response =
    await api.post<
      LoginResponse
    >(
      "/api/v1/auth/register",
      prepareRegisterPayload(
        payload
      )
    );

  setAuthSession(
    response.data.token,
    response.data.user
  );

  return response.data;
}


export async function getMe():
  Promise<AuthUser> {
  const response =
    await api.get<AuthUser>(
      "/api/v1/auth/me"
    );

  return response.data;
}


export async function logout():
  Promise<void> {
  try {
    await api.post(
      "/api/v1/auth/logout",
      {}
    );
  } finally {
    clearAuthSession();
  }
}


export function getAuthApiError(
  error: unknown
): string {
  const candidate =
    error as {
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
    candidate
      .response
      ?.data
      ?.detail;

  if (
    typeof detail
    === "string"
  ) {
    return detail;
  }

  if (
    Array.isArray(
      detail
    )
  ) {
    return detail
      .map((item) => {
        if (
          typeof item
            === "object"
          && item !== null
          && "msg" in item
        ) {
          return String(
            (
              item as {
                msg?: unknown;
              }
            ).msg
            ?? "Data tidak valid"
          );
        }

        return String(item);
      })
      .join(", ");
  }

  const message =
    candidate
      .response
      ?.data
      ?.message;

  if (
    typeof message
    === "string"
  ) {
    return message;
  }

  if (
    candidate
      .response
      ?.status
    === 401
  ) {
    return (
      "Email atau password " +
      "tidak valid."
    );
  }

  if (
    candidate
      .response
      ?.status
    === 404
  ) {
    return (
      "Endpoint atau company " +
      "tidak ditemukan."
    );
  }

  if (
    candidate
      .response
      ?.status
    === 409
  ) {
    return (
      "Email atau company " +
      "sudah terdaftar."
    );
  }

  if (
    candidate
      .response
      ?.status
    === 422
  ) {
    return (
      "Data belum lengkap " +
      "atau tidak valid."
    );
  }

  if (
    candidate
      .response
      ?.status
    === 429
  ) {
    return (
      "Terlalu banyak " +
      "percobaan. Silakan " +
      "tunggu beberapa saat."
    );
  }

  return (
    candidate.message
    ?? "Request autentikasi " +
      "gagal diproses."
  );
}
