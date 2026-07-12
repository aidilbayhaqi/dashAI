import type {
  ProvisionCompanyBranchInput,
  ProvisionCompanyInput,
  ProvisionCompanyUserInput,
} from "../types";
import type { CompanySectionItem } from "./types";

export const companyCreateSections: CompanySectionItem[] = [
  { key: "company", label: "Company", description: "Informasi utama perusahaan" },
  { key: "owner", label: "Owner", description: "Akun pemilik perusahaan" },
  { key: "users", label: "Users", description: "Admin dan staff tambahan" },
  { key: "branches", label: "Branches", description: "Cabang tambahan perusahaan" },
];

export function createEmptyCompanyUser(): ProvisionCompanyUserInput {
  return {
    full_name: "",
    email: "",
    phone: "",
    password: "",
    avatar_url: "",
    job_title: "",
    department_name: "",
    role_code: "staff",
  };
}

export function createEmptyCompanyBranch(): ProvisionCompanyBranchInput {
  return {
    code: "",
    name: "",
    branch_type: "branch",
    email: "",
    phone: "",
    address_line: "",
    city: "",
    province: "",
    country: "Indonesia",
    postal_code: "",
    is_active: true,
  };
}

export function createInitialCompanyForm(): ProvisionCompanyInput {
  return {
    company: {
      name: "",
      legal_name: "",
      tax_number: "",
      email: "",
      phone: "",
      website: "",
      industry: "",
      company_size: "",
      address_line: "",
      city: "",
      province: "",
      country: "Indonesia",
      postal_code: "",
      default_currency: "IDR",
      timezone: "Asia/Jakarta",
      fiscal_year_start_month: 1,
      logo_url: "",
      status: "active",
      is_active: true,
    },
    owner: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      avatar_url: "",
      job_title: "Owner",
      department_name: "Management",
    },
    users: [],
    branches: [],
  };
}
