export type CompanyStatus =
  | "active"
  | "inactive"
  | "suspended";

export type CompanyBranchType =
  | "head_office"
  | "branch"
  | "outlet"
  | "warehouse";

export type CompanyUserRole =
  | "admin"
  | "staff";

export type CompanyListItem = {
  id: string;

  name: string;
  legal_name?: string | null;
  tax_number?: string | null;

  email?: string | null;
  phone?: string | null;
  website?: string | null;

  industry?: string | null;
  company_size?: string | null;

  address_line?: string | null;
  city?: string | null;
  province?: string | null;
  country: string;
  postal_code?: string | null;

  default_currency: string;
  timezone: string;
  fiscal_year_start_month: number;

  logo_url?: string | null;

  status: CompanyStatus;
  is_active: boolean;

  created_at: string;
  updated_at: string;
};

export type CompanyBranch = {
  id: string;
  company_id: string;

  code: string;
  name: string;

  branch_type: CompanyBranchType;

  email?: string | null;
  phone?: string | null;

  address_line?: string | null;
  city?: string | null;
  province?: string | null;
  country: string;
  postal_code?: string | null;

  is_head_office: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
};

export type CompanyDetailUser = {
  id: string;

  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;

  role_code: string;
  role_name: string;

  job_title?: string | null;
  department_name?: string | null;

  is_owner: boolean;
  is_active: boolean;

  last_login_at?: string | null;
  created_at: string;
};

export type CompanyDetail = {
  company: CompanyListItem;

  branches: CompanyBranch[];
  users: CompanyDetailUser[];

  branches_count: number;
  users_count: number;
};

export type CompanyUpdateInput = {
  name: string;

  legal_name?: string | null;
  tax_number?: string | null;

  email?: string | null;
  phone?: string | null;
  website?: string | null;

  industry?: string | null;
  company_size?: string | null;

  address_line?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postal_code?: string | null;

  default_currency?: string | null;
  timezone?: string | null;
  fiscal_year_start_month?: number | null;

  logo_url?: string | null;

  status?: CompanyStatus | null;
  is_active?: boolean | null;
};

export type ProvisionCompanyOwnerInput = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;

  avatar_url?: string;
  job_title?: string;
  department_name?: string;
};

export type ProvisionCompanyUserInput = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;

  avatar_url?: string;
  job_title?: string;
  department_name?: string;

  role_code: CompanyUserRole;
};

export type ProvisionCompanyBranchInput = {
  code: string;
  name: string;

  branch_type:
    | "branch"
    | "outlet"
    | "warehouse";

  email?: string;
  phone?: string;

  address_line?: string;
  city?: string;
  province?: string;
  country: string;
  postal_code?: string;

  is_active: boolean;
};

export type ProvisionCompanyInput = {
  company: {
    name: string;
    legal_name?: string;
    tax_number?: string;

    email?: string;
    phone?: string;
    website?: string;

    industry?: string;
    company_size?: string;

    address_line?: string;
    city?: string;
    province?: string;
    country: string;
    postal_code?: string;

    default_currency: string;
    timezone: string;
    fiscal_year_start_month: number;

    logo_url?: string;

    status: CompanyStatus;
    is_active: boolean;
  };

  owner: ProvisionCompanyOwnerInput;

  users: ProvisionCompanyUserInput[];

  branches: ProvisionCompanyBranchInput[];
};