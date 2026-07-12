import { Building2 } from "lucide-react";

import type { ProvisionCompanyInput } from "../../types";
import {
  CompanyFormInput,
  CompanyFormSectionHeader,
  CompanyFormSelect,
} from "../form-fields";
import type { UpdateCompany } from "../types";

export function CompanyInformationSection({
  company,
  updateCompany,
}: {
  company: ProvisionCompanyInput["company"];
  updateCompany: UpdateCompany;
}) {
  return (
    <div>
      <CompanyFormSectionHeader
        title="Company Information"
        description="Isi informasi utama perusahaan atau tenant."
        icon={<Building2 size={20} />}
      />

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <CompanyFormInput
          label="Company Name"
          value={company.name}
          required
          placeholder="PT DashAI Indonesia"
          onChange={(value) => updateCompany("name", value)}
        />
        <CompanyFormInput
          label="Legal Name"
          value={company.legal_name ?? ""}
          placeholder="PT DashAI Indonesia"
          onChange={(value) => updateCompany("legal_name", value)}
        />
        <CompanyFormInput
          label="NPWP / Tax Number"
          value={company.tax_number ?? ""}
          onChange={(value) => updateCompany("tax_number", value)}
        />
        <CompanyFormInput
          label="Company Email"
          type="email"
          value={company.email ?? ""}
          placeholder="office@company.com"
          onChange={(value) => updateCompany("email", value)}
        />
        <CompanyFormInput
          label="Company Phone"
          value={company.phone ?? ""}
          placeholder="081234567890"
          onChange={(value) => updateCompany("phone", value)}
        />
        <CompanyFormInput
          label="Website"
          type="url"
          value={company.website ?? ""}
          placeholder="https://company.com"
          onChange={(value) => updateCompany("website", value)}
        />
        <CompanyFormInput
          label="Industry"
          value={company.industry ?? ""}
          placeholder="Technology"
          onChange={(value) => updateCompany("industry", value)}
        />
        <CompanyFormInput
          label="Company Size"
          value={company.company_size ?? ""}
          placeholder="11-50"
          onChange={(value) => updateCompany("company_size", value)}
        />
        <CompanyFormInput
          label="Default Currency"
          value={company.default_currency}
          placeholder="IDR"
          onChange={(value) => updateCompany("default_currency", value.toUpperCase())}
        />
        <CompanyFormInput
          label="Timezone"
          value={company.timezone}
          placeholder="Asia/Jakarta"
          onChange={(value) => updateCompany("timezone", value)}
        />
        <CompanyFormInput
          label="Fiscal Start Month"
          type="number"
          min={1}
          max={12}
          value={company.fiscal_year_start_month}
          onChange={(value) => updateCompany("fiscal_year_start_month", Number(value || 1))}
        />
        <CompanyFormInput
          label="Logo URL"
          type="url"
          value={company.logo_url ?? ""}
          onChange={(value) => updateCompany("logo_url", value)}
        />
        <div className="md:col-span-2">
          <CompanyFormInput
            label="Address"
            value={company.address_line ?? ""}
            placeholder="Alamat lengkap perusahaan"
            onChange={(value) => updateCompany("address_line", value)}
          />
        </div>
        <CompanyFormInput
          label="City"
          value={company.city ?? ""}
          onChange={(value) => updateCompany("city", value)}
        />
        <CompanyFormInput
          label="Province"
          value={company.province ?? ""}
          onChange={(value) => updateCompany("province", value)}
        />
        <CompanyFormInput
          label="Country"
          value={company.country}
          onChange={(value) => updateCompany("country", value)}
        />
        <CompanyFormInput
          label="Postal Code"
          value={company.postal_code ?? ""}
          onChange={(value) => updateCompany("postal_code", value)}
        />
        <CompanyFormSelect
          label="Status"
          value={company.status}
          onChange={(value) => updateCompany("status", value as ProvisionCompanyInput["company"]["status"])}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </CompanyFormSelect>
        <CompanyFormSelect
          label="Is Active"
          value={String(company.is_active)}
          onChange={(value) => updateCompany("is_active", value === "true")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </CompanyFormSelect>
      </div>
    </div>
  );
}
