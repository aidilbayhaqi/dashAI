import { Plus, Trash2, UsersRound } from "lucide-react";

import type { ProvisionCompanyUserInput } from "../../types";
import {
  CompanyFormInput,
  CompanyFormSectionHeader,
  CompanyFormSelect,
} from "../form-fields";
import type { UpdateUser } from "../types";

export function CompanyUsersSection({
  users,
  addUser,
  removeUser,
  updateUser,
}: {
  users: ProvisionCompanyUserInput[];
  addUser: () => void;
  removeUser: (index: number) => void;
  updateUser: UpdateUser;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CompanyFormSectionHeader
          title="Additional Users"
          description="Tambahkan akun Administrator atau Staff."
          icon={<UsersRound size={20} />}
        />
        <button
          type="button"
          onClick={addUser}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-800">
          <UsersRound size={32} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">Belum ada user tambahan</p>
          <p className="mt-1 text-xs text-slate-500">Owner tetap dibuat meskipun tanpa user tambahan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user, index) => (
            <div key={`${user.email}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a] sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">User {index + 1}</h3>
                  <p className="mt-1 text-xs text-slate-500">Akun tambahan company</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeUser(index)}
                  aria-label={`Hapus user ${index + 1}`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <CompanyFormInput label="Full Name" value={user.full_name} required onChange={(value) => updateUser(index, "full_name", value)} />
                <CompanyFormInput label="Email" type="email" value={user.email} required onChange={(value) => updateUser(index, "email", value)} />
                <CompanyFormInput label="Phone" value={user.phone ?? ""} onChange={(value) => updateUser(index, "phone", value)} />
                <CompanyFormInput label="Password" type="password" value={user.password} required placeholder="Minimal 8 karakter" onChange={(value) => updateUser(index, "password", value)} />
                <CompanyFormInput label="Job Title" value={user.job_title ?? ""} onChange={(value) => updateUser(index, "job_title", value)} />
                <CompanyFormInput label="Department" value={user.department_name ?? ""} onChange={(value) => updateUser(index, "department_name", value)} />
                <CompanyFormSelect
                  label="Role"
                  value={user.role_code}
                  required
                  onChange={(value) => updateUser(index, "role_code", value as ProvisionCompanyUserInput["role_code"])}
                >
                  <option value="admin">Administrator</option>
                  <option value="staff">Staff</option>
                </CompanyFormSelect>
                <CompanyFormInput label="Avatar URL" type="url" value={user.avatar_url ?? ""} onChange={(value) => updateUser(index, "avatar_url", value)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
