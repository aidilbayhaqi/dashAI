export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  is_superuser: boolean;
  company_id: string | null;
  role_id: string | null;
  permissions: string[];
  branch_ids: string[];
};

export type LoginResponse = {
  user: AuthUser;
  token: TokenResponse;
};

export type LoginPayload = {
  email: string;
  password: string;
  company_id?: string | null;
};

export type RegisterAccountType =
  | "company_owner"
  | "company_user";

export type RegisterPayload = {
  account_type: RegisterAccountType;

  full_name: string;
  email: string;
  phone?: string;

  password: string;
  confirm_password: string;

  /*
   * Wajib ketika account_type = company_user
   */
  company_id?: string;

  job_title?: string;
  department_name?: string;

  /*
   * Wajib/digunakan ketika account_type = company_owner
   */
  company_name?: string;
  legal_name?: string;

  company_email?: string;
  company_phone?: string;

  company_industry?: string;
  company_size?: string;

  address_line?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
};

export type RegisterCompanyOption = {
  id: string;
  name: string;

  legal_name?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
};

export type DashboardSummary = {
  total_products: number;
  total_employees: number;
  total_leads: number;
  total_deals: number;
  total_revenue: number;
};