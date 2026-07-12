import type {
  ProvisionCompanyBranchInput,
  ProvisionCompanyInput,
  ProvisionCompanyUserInput,
} from "../types";

export type CompanyCreateSectionKey = "company" | "owner" | "users" | "branches";

export type CompanySectionItem = {
  key: CompanyCreateSectionKey;
  label: string;
  description: string;
};

export type UpdateCompany = <K extends keyof ProvisionCompanyInput["company"]>(
  key: K,
  value: ProvisionCompanyInput["company"][K],
) => void;

export type UpdateOwner = <K extends keyof ProvisionCompanyInput["owner"]>(
  key: K,
  value: ProvisionCompanyInput["owner"][K],
) => void;

export type UpdateUser = <K extends keyof ProvisionCompanyUserInput>(
  index: number,
  key: K,
  value: ProvisionCompanyUserInput[K],
) => void;

export type UpdateBranch = <K extends keyof ProvisionCompanyBranchInput>(
  index: number,
  key: K,
  value: ProvisionCompanyBranchInput[K],
) => void;
