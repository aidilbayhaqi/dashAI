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
  refresh_token: string;
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

export type RegisterPayload = {
  account_type: "company_owner" | "company_user";
  full_name: string;
  email: string;
  password: string;
  company_name: string;
  company_industry?: string;
  company_size?: string;
  user_role?: string;
};

export type DashboardSummary = {
  total_products: number;
  total_employees: number;
  total_leads: number;
  total_deals: number;
  total_revenue: number;
};