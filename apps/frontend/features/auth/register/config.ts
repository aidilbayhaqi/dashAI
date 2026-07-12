import type { RegisterAccountType, RegisterPayload } from "@/types/backend";

export type RegisterMode = "company" | "user";

export const companySizes = ["1-10", "11-50", "51-200", "201-500", "500+"];

export const industries = [
  "Technology",
  "Retail",
  "Manufacturing",
  "Education",
  "Healthcare",
  "Finance",
  "Services",
  "Logistics",
  "Hospitality",
  "Construction",
  "Other",
];

export function getRegisterAccountType(mode: RegisterMode): RegisterAccountType {
  return mode === "company" ? "company_owner" : "company_user";
}

export function isValidRegisterEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function createInitialRegisterForm(): RegisterPayload {
  return {
    account_type: "company_owner",
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    company_id: "",
    job_title: "",
    department_name: "",
    company_name: "",
    legal_name: "",
    company_email: "",
    company_phone: "",
    company_industry: "Technology",
    company_size: "1-10",
    address_line: "",
    city: "",
    province: "",
    country: "Indonesia",
    postal_code: "",
  };
}
