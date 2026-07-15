"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-error";

import {
  createCompanyBranch,
  createCompanyProfile,
  getCompanyProfileData,
  getProfileDisplayValue,
  updateCompanyProfile,
  type BranchPayload,
  type CompanyProfilePayload,
  type CompanyProfileRow,
} from "./api";

function getString(row: CompanyProfileRow | null | undefined, keys: string[]) {
  return getProfileDisplayValue(row, keys, "") || "";
}

function getLegalIdentity(company: CompanyProfileRow | null) {
  return (
    getProfileDisplayValue(
      company,
      [
        "npwp",
        "tax_number",
        "legal_no",
        "legal_number",
        "registration_number",
        "business_license_no",
      ],
      "-"
    ) || "-"
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
        {label}
      </span>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
      />
    </label>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-black text-slate-900 dark:text-white">
            {value || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <Icon size={21} />
      </div>

      <div>
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export function CompanyProfileClient() {
  const queryClient = useQueryClient();

  const [companyForm, setCompanyForm] = useState<CompanyProfilePayload>({
    name: "",
    legal_name: "",
    business_name: "",
    legal_no: "",
    tax_number: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
  });

  const [branchForm, setBranchForm] = useState<BranchPayload>({
    name: "",
    code: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    is_active: true,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["company-profile"],
    queryFn: getCompanyProfileData,
  });

  useEffect(() => {
    if (!data?.company) return;

    setCompanyForm({
      name: getString(data.company, ["name", "company_name"]),
      legal_name: getString(data.company, ["legal_name"]),
      business_name: getString(data.company, ["business_name"]),
      legal_no: getString(data.company, [
        "legal_no",
        "legal_number",
        "registration_number",
        "business_license_no",
      ]),
      tax_number: getString(data.company, ["tax_number", "npwp"]),
      email: getString(data.company, ["email", "company_email"]),
      phone: getString(data.company, ["phone", "company_phone"]),
      website: getString(data.company, ["website"]),
      address: getString(data.company, ["address"]),
      city: getString(data.company, ["city"]),
      province: getString(data.company, ["province"]),
      postal_code: getString(data.company, ["postal_code", "zip_code"]),
    });
  }, [data?.company]);

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["company-profile"],
    });
  }

  const saveCompanyMutation = useMutation({
    mutationFn: async () => {
      if (data?.companyId) {
        return updateCompanyProfile(data.companyId, companyForm);
      }

      return createCompanyProfile(companyForm);
    },
    onSuccess: invalidate,
  });

  const createBranchMutation = useMutation({
    mutationFn: async () => {
      if (!data?.companyId) {
        throw new Error("Company belum tersedia. Simpan data perusahaan dulu.");
      }

      return createCompanyBranch(data.companyId, branchForm);
    },
    onSuccess: () => {
      setBranchForm({
        name: "",
        code: "",
        phone: "",
        address: "",
        city: "",
        province: "",
        postal_code: "",
        is_active: true,
      });

      invalidate();
    },
  });

  function updateCompanyField<K extends keyof CompanyProfilePayload>(
    key: K,
    value: CompanyProfilePayload[K]
  ) {
    setCompanyForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateBranchField<K extends keyof BranchPayload>(
    key: K,
    value: BranchPayload[K]
  ) {
    setBranchForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-600 shadow-sm dark:border-slate-900 dark:bg-[#050816] dark:text-slate-300">
          <Loader2 size={18} className="animate-spin" />
          Loading company profile...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 sm:p-6 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        {getApiErrorMessage(error)}
      </div>
    );
  }

  const user = data?.user ?? null;
  const company = data?.company ?? null;
  const branches = data?.branches ?? [];

  const companyName = getProfileDisplayValue(company, [
    "name",
    "company_name",
    "business_name",
    "legal_name",
  ]);

  const legalIdentity = getLegalIdentity(company);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-900 dark:bg-[#050816]">
        <div className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-6 dark:border-slate-900 dark:bg-[#02040a]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#0f2a5f] text-white shadow-lg shadow-blue-950/20">
                <Building2 size={29} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">
                  Company Workspace
                </p>

                <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {companyName === "-" ? "Setup Company Profile" : companyName}
                </h1>

                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-500">
                  Kelola profil perusahaan, legal identity, dan cabang aktif.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <ShieldCheck size={17} />
              Legal No / NPWP: {legalIdentity}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={UserRound}
            label="Current User"
            value={getProfileDisplayValue(user, ["name", "full_name", "username"])}
          />
          <SummaryCard
            icon={Mail}
            label="User Email"
            value={getProfileDisplayValue(user, ["email"])}
          />
          <SummaryCard
            icon={ShieldCheck}
            label="User Role"
            value={getProfileDisplayValue(user, ["role", "role_name"])}
          />
          <SummaryCard
            icon={FileText}
            label="Legal Identity"
            value={legalIdentity}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <div className="rounded-[1.5rem] border sm:rounded-[2rem] border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
          <SectionHeader
            icon={Building2}
            title="Informasi Perusahaan"
            description="Edit data utama perusahaan yang terhubung dengan current user."
          />

          {!company ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Company belum ditemukan. Isi form ini untuk membuat profil perusahaan.
            </div>
          ) : null}

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveCompanyMutation.mutate();
            }}
          >
            <Field
              label="Company Name"
              required
              value={companyForm.name ?? ""}
              placeholder="PT Contoh Perusahaan"
              onChange={(value) => updateCompanyField("name", value)}
            />

            <Field
              label="Business Name"
              value={companyForm.business_name ?? ""}
              placeholder="Nama brand / nama usaha"
              onChange={(value) => updateCompanyField("business_name", value)}
            />

            <Field
              label="Legal Name"
              value={companyForm.legal_name ?? ""}
              placeholder="PT Contoh Perusahaan Indonesia"
              onChange={(value) => updateCompanyField("legal_name", value)}
            />

            <Field
              label="Legal No"
              value={companyForm.legal_no ?? ""}
              placeholder="Nomor legal / registration number"
              onChange={(value) => updateCompanyField("legal_no", value)}
            />

            <Field
              label="NPWP"
              value={companyForm.tax_number ?? ""}
              placeholder="Nomor NPWP perusahaan"
              onChange={(value) => updateCompanyField("tax_number", value)}
            />

            <Field
              label="Email"
              type="email"
              value={companyForm.email ?? ""}
              placeholder="company@email.com"
              onChange={(value) => updateCompanyField("email", value)}
            />

            <Field
              label="Phone"
              value={companyForm.phone ?? ""}
              placeholder="+62-812-xxxx"
              onChange={(value) => updateCompanyField("phone", value)}
            />

            <Field
              label="Website"
              value={companyForm.website ?? ""}
              placeholder="https://company.com"
              onChange={(value) => updateCompanyField("website", value)}
            />

            <Field
              label="City"
              value={companyForm.city ?? ""}
              placeholder="Tangerang Selatan"
              onChange={(value) => updateCompanyField("city", value)}
            />

            <Field
              label="Province"
              value={companyForm.province ?? ""}
              placeholder="Banten"
              onChange={(value) => updateCompanyField("province", value)}
            />

            <Field
              label="Postal Code"
              value={companyForm.postal_code ?? ""}
              placeholder="15417"
              onChange={(value) => updateCompanyField("postal_code", value)}
            />

            <TextArea
              label="Address"
              value={companyForm.address ?? ""}
              placeholder="Alamat lengkap perusahaan"
              onChange={(value) => updateCompanyField("address", value)}
              className="md:col-span-2"
            />

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saveCompanyMutation.isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {saveCompanyMutation.isPending ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                {data?.companyId ? "Save Company" : "Create Company"}
              </button>

              {saveCompanyMutation.isError ? (
                <p className="mt-3 text-sm font-bold text-rose-600">
                  {getApiErrorMessage(saveCompanyMutation.error)}
                </p>
              ) : null}
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.5rem] border sm:rounded-[2rem] border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
            <SectionHeader
              icon={Globe2}
              title="Company Snapshot"
              description="Ringkasan cepat dari profil perusahaan."
            />

            <div className="space-y-3">
              <SummaryCard icon={Building2} label="Company" value={companyName} />
              <SummaryCard
                icon={FileText}
                label="Legal No / NPWP"
                value={legalIdentity}
              />
              <SummaryCard
                icon={Phone}
                label="Phone"
                value={getProfileDisplayValue(company, ["phone", "company_phone"])}
              />
              <SummaryCard
                icon={MapPin}
                label="Location"
                value={`${getProfileDisplayValue(company, ["city"], "-")} / ${getProfileDisplayValue(company, ["province"], "-")}`}
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border sm:rounded-[2rem] border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
            <SectionHeader
              icon={Plus}
              title="Tambah Cabang"
              description="Cabang akan otomatis masuk ke company saat ini."
            />

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createBranchMutation.mutate();
              }}
            >
              <Field
                label="Branch Name"
                required
                value={branchForm.name ?? ""}
                placeholder="Cabang BSD"
                onChange={(value) => updateBranchField("name", value)}
              />

              <Field
                label="Branch Code"
                value={branchForm.code ?? ""}
                placeholder="BSD-001"
                onChange={(value) => updateBranchField("code", value)}
              />

              <Field
                label="Phone"
                value={branchForm.phone ?? ""}
                placeholder="+62-812-xxxx"
                onChange={(value) => updateBranchField("phone", value)}
              />

              <Field
                label="City"
                value={branchForm.city ?? ""}
                placeholder="Tangerang Selatan"
                onChange={(value) => updateBranchField("city", value)}
              />

              <Field
                label="Province"
                value={branchForm.province ?? ""}
                placeholder="Banten"
                onChange={(value) => updateBranchField("province", value)}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-900 dark:bg-[#02040a]">
                <input
                  type="checkbox"
                  checked={Boolean(branchForm.is_active)}
                  onChange={(event) =>
                    updateBranchField("is_active", event.target.checked)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                  Branch Active
                </span>
              </label>

              <TextArea
                label="Address"
                value={branchForm.address ?? ""}
                placeholder="Alamat cabang"
                onChange={(value) => updateBranchField("address", value)}
              />

              <button
                type="submit"
                disabled={!data?.companyId || createBranchMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {createBranchMutation.isPending ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Plus size={17} />
                )}
                Add Branch
              </button>

              {!data?.companyId ? (
                <p className="text-sm font-bold text-amber-600">
                  Simpan data perusahaan dulu sebelum menambahkan cabang.
                </p>
              ) : null}

              {createBranchMutation.isError ? (
                <p className="text-sm font-bold text-rose-600">
                  {getApiErrorMessage(createBranchMutation.error)}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border sm:rounded-[2rem] border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
        <SectionHeader
          icon={MapPin}
          title="Daftar Cabang"
          description="Daftar cabang dari perusahaan current user."
        />

        {branches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:text-slate-500">
            Belum ada cabang.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-900">
            <div className="space-y-3 p-3 md:hidden">
              {branches.map((branch, index) => {
                const activeValue = branch.is_active ?? branch.status ?? true;
                const isActive =
                  activeValue === true ||
                  String(activeValue).toLowerCase() === "active" ||
                  String(activeValue).toLowerCase() === "true";

                return (
                  <article
                    key={`mobile-${String(branch.id ?? branch.uuid ?? index)}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-slate-950 dark:text-white">
                          {getProfileDisplayValue(branch, ["name", "branch_name"])}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                          {getProfileDisplayValue(branch, ["code", "branch_code"])}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <CheckCircle2 size={13} />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-black uppercase tracking-wider text-slate-400">Phone</dt>
                        <dd className="mt-1 break-words font-bold text-slate-700 dark:text-slate-300">
                          {getProfileDisplayValue(branch, ["phone"])}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-black uppercase tracking-wider text-slate-400">Location</dt>
                        <dd className="mt-1 break-words font-bold text-slate-700 dark:text-slate-300">
                          {[
                            getProfileDisplayValue(branch, ["city"], ""),
                            getProfileDisplayValue(branch, ["province"], ""),
                          ].filter(Boolean).join(", ") || "-"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-slate-50 dark:bg-[#02040a]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Code
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Branch
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      City
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Province
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {branches.map((branch, index) => {
                    const activeValue = branch.is_active ?? branch.status ?? true;
                    const isActive =
                      activeValue === true ||
                      String(activeValue).toLowerCase() === "active" ||
                      String(activeValue).toLowerCase() === "true";

                    return (
                      <tr key={String(branch.id ?? branch.uuid ?? index)}>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                          {getProfileDisplayValue(branch, ["code", "branch_code"])}
                        </td>
                        <td className="px-4 py-4 text-sm font-black text-slate-900 dark:text-white">
                          {getProfileDisplayValue(branch, ["name", "branch_name"])}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                          {getProfileDisplayValue(branch, ["phone"])}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                          {getProfileDisplayValue(branch, ["city"])}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                          {getProfileDisplayValue(branch, ["province"])}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <CheckCircle2 size={13} />
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}