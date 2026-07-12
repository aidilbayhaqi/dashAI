import { UserRound } from "lucide-react";

import type { ProvisionCompanyInput } from "../../types";
import { CompanyFormInput, CompanyFormSectionHeader } from "../form-fields";
import type { UpdateOwner } from "../types";

export function CompanyOwnerSection({
  owner,
  updateOwner,
}: {
  owner: ProvisionCompanyInput["owner"];
  updateOwner: UpdateOwner;
}) {
  return (
    <div>
      <CompanyFormSectionHeader
        title="Owner Account"
        description="Akun utama pemilik company dengan akses penuh."
        icon={<UserRound size={20} />}
      />
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <CompanyFormInput
          label="Full Name"
          value={owner.full_name}
          required
          placeholder="Nama lengkap owner"
          onChange={(value) => updateOwner("full_name", value)}
        />
        <CompanyFormInput
          label="Email"
          type="email"
          value={owner.email}
          required
          placeholder="owner@company.com"
          onChange={(value) => updateOwner("email", value)}
        />
        <CompanyFormInput
          label="Phone"
          value={owner.phone ?? ""}
          placeholder="081234567890"
          onChange={(value) => updateOwner("phone", value)}
        />
        <CompanyFormInput
          label="Password"
          type="password"
          value={owner.password}
          required
          placeholder="Minimal 8 karakter"
          onChange={(value) => updateOwner("password", value)}
        />
        <CompanyFormInput
          label="Job Title"
          value={owner.job_title ?? ""}
          placeholder="Chief Executive Officer"
          onChange={(value) => updateOwner("job_title", value)}
        />
        <CompanyFormInput
          label="Department"
          value={owner.department_name ?? ""}
          placeholder="Management"
          onChange={(value) => updateOwner("department_name", value)}
        />
        <div className="md:col-span-2">
          <CompanyFormInput
            label="Avatar URL"
            type="url"
            value={owner.avatar_url ?? ""}
            onChange={(value) => updateOwner("avatar_url", value)}
          />
        </div>
      </div>
    </div>
  );
}
