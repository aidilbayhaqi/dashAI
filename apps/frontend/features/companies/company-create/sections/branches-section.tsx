import { GitBranch, Plus, Trash2 } from "lucide-react";

import type { ProvisionCompanyBranchInput } from "../../types";
import {
  CompanyFormInput,
  CompanyFormSectionHeader,
  CompanyFormSelect,
} from "../form-fields";
import type { UpdateBranch } from "../types";

export function CompanyBranchesSection({
  branches,
  addBranch,
  removeBranch,
  updateBranch,
}: {
  branches: ProvisionCompanyBranchInput[];
  addBranch: () => void;
  removeBranch: (index: number) => void;
  updateBranch: UpdateBranch;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CompanyFormSectionHeader
          title="Additional Branches"
          description="Head Office dengan kode HQ akan dibuat otomatis."
          icon={<GitBranch size={20} />}
        />
        <button
          type="button"
          onClick={addBranch}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300"
        >
          <Plus size={16} /> Add Branch
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-800">
          <GitBranch size={32} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">Belum ada branch tambahan</p>
          <p className="mt-1 text-xs text-slate-500">Head Office akan dibuat otomatis oleh backend.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map((branch, index) => (
            <div key={`${branch.code}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a] sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">Branch {index + 1}</h3>
                  <p className="mt-1 text-xs text-slate-500">Cabang tambahan company</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeBranch(index)}
                  aria-label={`Hapus branch ${index + 1}`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <CompanyFormInput label="Branch Code" value={branch.code} required placeholder="JKT-01" onChange={(value) => updateBranch(index, "code", value.toUpperCase())} />
                <CompanyFormInput label="Branch Name" value={branch.name} required placeholder="Cabang Jakarta" onChange={(value) => updateBranch(index, "name", value)} />
                <CompanyFormSelect
                  label="Branch Type"
                  value={branch.branch_type}
                  required
                  onChange={(value) => updateBranch(index, "branch_type", value as ProvisionCompanyBranchInput["branch_type"])}
                >
                  <option value="branch">Branch</option>
                  <option value="outlet">Outlet</option>
                  <option value="warehouse">Warehouse</option>
                </CompanyFormSelect>
                <CompanyFormSelect label="Active" value={String(branch.is_active)} onChange={(value) => updateBranch(index, "is_active", value === "true")}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </CompanyFormSelect>
                <CompanyFormInput label="Email" type="email" value={branch.email ?? ""} onChange={(value) => updateBranch(index, "email", value)} />
                <CompanyFormInput label="Phone" value={branch.phone ?? ""} onChange={(value) => updateBranch(index, "phone", value)} />
                <div className="md:col-span-2">
                  <CompanyFormInput label="Address" value={branch.address_line ?? ""} onChange={(value) => updateBranch(index, "address_line", value)} />
                </div>
                <CompanyFormInput label="City" value={branch.city ?? ""} onChange={(value) => updateBranch(index, "city", value)} />
                <CompanyFormInput label="Province" value={branch.province ?? ""} onChange={(value) => updateBranch(index, "province", value)} />
                <CompanyFormInput label="Country" value={branch.country} onChange={(value) => updateBranch(index, "country", value)} />
                <CompanyFormInput label="Postal Code" value={branch.postal_code ?? ""} onChange={(value) => updateBranch(index, "postal_code", value)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
