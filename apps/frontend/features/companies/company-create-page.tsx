"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Plus,
  ShieldAlert,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";

import {
  getCompanyApiError,
  provisionCompany,
} from "./api";

import type {
  ProvisionCompanyBranchInput,
  ProvisionCompanyInput,
  ProvisionCompanyUserInput,
} from "./types";

type SectionKey =
  | "company"
  | "owner"
  | "users"
  | "branches";

type SectionItem = {
  key: SectionKey;
  label: string;
  description: string;
};

const sections: SectionItem[] = [
  {
    key: "company",
    label: "Company",
    description:
      "Informasi utama perusahaan",
  },
  {
    key: "owner",
    label: "Owner",
    description:
      "Akun pemilik perusahaan",
  },
  {
    key: "users",
    label: "Users",
    description:
      "Admin dan staff tambahan",
  },
  {
    key: "branches",
    label: "Branches",
    description:
      "Cabang tambahan perusahaan",
  },
];

function createEmptyUser(): ProvisionCompanyUserInput {
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

function createEmptyBranch(): ProvisionCompanyBranchInput {
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

function createInitialForm(): ProvisionCompanyInput {
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
      department_name:
        "Management",
    },

    users: [],
    branches: [],
  };
}

function isValidEmail(
  value: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function SectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-6 flex min-w-0 items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        {icon}
      </div>

      <div className="min-w-0">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (
    value: string
  ) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#02040a] dark:text-white"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </span>

      <select
        value={value}
        required={required}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#02040a] dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}

export function CompanyCreatePage() {
  const router = useRouter();
  const queryClient =
    useQueryClient();

  const [
    accessChecked,
    setAccessChecked,
  ] = useState(false);

  const [
    isSuperAdmin,
    setIsSuperAdmin,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<ProvisionCompanyInput>(
    createInitialForm()
  );

  const [
    activeSection,
    setActiveSection,
  ] = useState<SectionKey>(
    "company"
  );

  const [
    validationError,
    setValidationError,
  ] = useState<string | null>(
    null
  );

  const [
    requestError,
    setRequestError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    const allowed =
      isCurrentUserSuperAdmin();

    setIsSuperAdmin(allowed);
    setAccessChecked(true);
  }, []);

  const createMutation =
    useMutation({
      mutationFn:
        provisionCompany,

      onSuccess: async () => {
        await queryClient
          .invalidateQueries({
            queryKey: [
              "companies",
              "list",
            ],
          });

        router.push("/companies");
        router.refresh();
      },

      onError: (error) => {
        setRequestError(
          getCompanyApiError(error)
        );
      },
    });

  const currentIndex =
    sections.findIndex(
      (section) =>
        section.key === activeSection
    );

  function updateCompany<
    K extends keyof ProvisionCompanyInput["company"],
  >(
    key: K,
    value: ProvisionCompanyInput["company"][K]
  ) {
    setValidationError(null);
    setRequestError(null);

    setForm((current) => ({
      ...current,

      company: {
        ...current.company,
        [key]: value,
      },
    }));
  }

  function updateOwner<
    K extends keyof ProvisionCompanyInput["owner"],
  >(
    key: K,
    value: ProvisionCompanyInput["owner"][K]
  ) {
    setValidationError(null);
    setRequestError(null);

    setForm((current) => ({
      ...current,

      owner: {
        ...current.owner,
        [key]: value,
      },
    }));
  }

  function updateUser<
    K extends keyof ProvisionCompanyUserInput,
  >(
    index: number,
    key: K,
    value: ProvisionCompanyUserInput[K]
  ) {
    setValidationError(null);
    setRequestError(null);

    setForm((current) => ({
      ...current,

      users: current.users.map(
        (user, userIndex) =>
          userIndex === index
            ? {
                ...user,
                [key]: value,
              }
            : user
      ),
    }));
  }

  function updateBranch<
    K extends keyof ProvisionCompanyBranchInput,
  >(
    index: number,
    key: K,
    value: ProvisionCompanyBranchInput[K]
  ) {
    setValidationError(null);
    setRequestError(null);

    setForm((current) => ({
      ...current,

      branches:
        current.branches.map(
          (
            branch,
            branchIndex
          ) =>
            branchIndex === index
              ? {
                  ...branch,
                  [key]: value,
                }
              : branch
        ),
    }));
  }

  function addUser() {
    setForm((current) => ({
      ...current,

      users: [
        ...current.users,
        createEmptyUser(),
      ],
    }));

    setActiveSection("users");
  }

  function removeUser(
    index: number
  ) {
    setForm((current) => ({
      ...current,

      users:
        current.users.filter(
          (_, userIndex) =>
            userIndex !== index
        ),
    }));
  }

  function addBranch() {
    setForm((current) => ({
      ...current,

      branches: [
        ...current.branches,
        createEmptyBranch(),
      ],
    }));

    setActiveSection("branches");
  }

  function removeBranch(
    index: number
  ) {
    setForm((current) => ({
      ...current,

      branches:
        current.branches.filter(
          (_, branchIndex) =>
            branchIndex !== index
        ),
    }));
  }

  function validateCompany() {
    if (
      form.company.name
        .trim()
        .length < 2
    ) {
      setValidationError(
        "Company Name wajib diisi minimal 2 karakter."
      );

      setActiveSection("company");
      return false;
    }

    if (
      form.company.email?.trim() &&
      !isValidEmail(
        form.company.email
      )
    ) {
      setValidationError(
        "Format email company tidak valid."
      );

      setActiveSection("company");
      return false;
    }

    const fiscalMonth =
      Number(
        form.company
          .fiscal_year_start_month
      );

    if (
      !Number.isInteger(
        fiscalMonth
      ) ||
      fiscalMonth < 1 ||
      fiscalMonth > 12
    ) {
      setValidationError(
        "Fiscal Start Month harus antara 1 sampai 12."
      );

      setActiveSection("company");
      return false;
    }

    return true;
  }

  function validateOwner() {
    if (
      form.owner.full_name
        .trim()
        .length < 2
    ) {
      setValidationError(
        "Nama owner wajib diisi minimal 2 karakter."
      );

      setActiveSection("owner");
      return false;
    }

    if (
      !isValidEmail(
        form.owner.email
      )
    ) {
      setValidationError(
        "Email owner tidak valid."
      );

      setActiveSection("owner");
      return false;
    }

    if (
      form.owner.password.length < 8
    ) {
      setValidationError(
        "Password owner minimal 8 karakter."
      );

      setActiveSection("owner");
      return false;
    }

    return true;
  }

  function validateUsers() {
    for (
      let index = 0;
      index < form.users.length;
      index += 1
    ) {
      const user =
        form.users[index];

      if (
        user.full_name
          .trim()
          .length < 2
      ) {
        setValidationError(
          `Nama User ${
            index + 1
          } wajib diisi.`
        );

        setActiveSection("users");
        return false;
      }

      if (
        !isValidEmail(user.email)
      ) {
        setValidationError(
          `Email User ${
            index + 1
          } tidak valid.`
        );

        setActiveSection("users");
        return false;
      }

      if (
        user.password.length < 8
      ) {
        setValidationError(
          `Password User ${
            index + 1
          } minimal 8 karakter.`
        );

        setActiveSection("users");
        return false;
      }
    }

    const emails = [
      form.owner.email
        .trim()
        .toLowerCase(),

      ...form.users.map(
        (user) =>
          user.email
            .trim()
            .toLowerCase()
      ),
    ];

    if (
      new Set(emails).size !==
      emails.length
    ) {
      setValidationError(
        "Email owner dan user tambahan tidak boleh sama."
      );

      setActiveSection("users");
      return false;
    }

    return true;
  }

  function validateBranches() {
    const codes =
      form.branches.map(
        (branch) =>
          branch.code
            .trim()
            .toUpperCase()
      );

    for (
      let index = 0;
      index <
      form.branches.length;
      index += 1
    ) {
      const branch =
        form.branches[index];

      const code =
        branch.code
          .trim()
          .toUpperCase();

      if (code.length < 2) {
        setValidationError(
          `Branch Code ${
            index + 1
          } wajib diisi.`
        );

        setActiveSection(
          "branches"
        );
        return false;
      }

      if (code === "HQ") {
        setValidationError(
          "Kode HQ tidak boleh digunakan karena Head Office dibuat otomatis."
        );

        setActiveSection(
          "branches"
        );
        return false;
      }

      if (
        branch.name
          .trim()
          .length < 2
      ) {
        setValidationError(
          `Branch Name ${
            index + 1
          } wajib diisi.`
        );

        setActiveSection(
          "branches"
        );
        return false;
      }

      if (
        branch.email?.trim() &&
        !isValidEmail(
          branch.email
        )
      ) {
        setValidationError(
          `Email Branch ${
            index + 1
          } tidak valid.`
        );

        setActiveSection(
          "branches"
        );
        return false;
      }
    }

    if (
      new Set(codes).size !==
      codes.length
    ) {
      setValidationError(
        "Branch Code tidak boleh duplikat."
      );

      setActiveSection("branches");
      return false;
    }

    return true;
  }

  function validateActiveSection() {
    setValidationError(null);

    if (
      activeSection === "company"
    ) {
      return validateCompany();
    }

    if (
      activeSection === "owner"
    ) {
      return validateOwner();
    }

    if (
      activeSection === "users"
    ) {
      return validateUsers();
    }

    return validateBranches();
  }

  function validateAll() {
    setValidationError(null);

    return (
      validateCompany() &&
      validateOwner() &&
      validateUsers() &&
      validateBranches()
    );
  }

  function goNext() {
    if (
      !validateActiveSection()
    ) {
      return;
    }

    const nextSection =
      sections[
        currentIndex + 1
      ];

    if (nextSection) {
      setActiveSection(
        nextSection.key
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  function goBack() {
    const previousSection =
      sections[
        currentIndex - 1
      ];

    if (previousSection) {
      setValidationError(null);

      setActiveSection(
        previousSection.key
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setRequestError(null);

    if (!validateAll()) {
      return;
    }

    try {
      await createMutation.mutateAsync(
        form
      );
    } catch {
      // Error ditampilkan oleh onError mutation.
    }
  }

  if (!accessChecked) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />

        <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            <ShieldAlert size={22} />
          </div>

          <div>
            <h1 className="text-xl font-black text-rose-900 dark:text-rose-200">
              Superadmin Only
            </h1>

            <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
              Hanya superadmin yang dapat
              membuat company.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/companies"
                )
              }
              className="mt-4 rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayedError =
    validationError ||
    requestError;

  return (
    <div className="min-w-0 space-y-6 pb-12">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/companies"
                )
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                Administration / Companies
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Add Company
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Buat company, akun owner,
                beberapa user, dan branch
                tambahan.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300">
            Step {currentIndex + 1} of{" "}
            {sections.length}
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="min-w-0 space-y-6"
      >
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {sections.map(
              (section, index) => {
                const active =
                  activeSection ===
                  section.key;

                const completed =
                  index < currentIndex;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => {
                      setValidationError(
                        null
                      );

                      setActiveSection(
                        section.key
                      );
                    }}
                    className={[
                      "flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-slate-900",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                        active
                          ? "bg-white/20 text-white"
                          : completed
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {completed ? (
                        <Check size={15} />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {section.label}
                      </span>

                      <span
                        className={[
                          "mt-0.5 block truncate text-[11px]",
                          active
                            ? "text-blue-100"
                            : "text-slate-400",
                        ].join(" ")}
                      >
                        {section.description}
                      </span>
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90 sm:p-6">
          {activeSection ===
            "company" && (
            <div>
              <SectionHeader
                title="Company Information"
                description="Isi informasi utama perusahaan atau tenant."
                icon={
                  <Building2 size={20} />
                }
              />

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <InputField
                  label="Company Name"
                  value={
                    form.company.name
                  }
                  required
                  placeholder="PT DashAI Indonesia"
                  onChange={(value) =>
                    updateCompany(
                      "name",
                      value
                    )
                  }
                />

                <InputField
                  label="Legal Name"
                  value={
                    form.company
                      .legal_name ?? ""
                  }
                  placeholder="PT DashAI Indonesia"
                  onChange={(value) =>
                    updateCompany(
                      "legal_name",
                      value
                    )
                  }
                />

                <InputField
                  label="NPWP / Tax Number"
                  value={
                    form.company
                      .tax_number ?? ""
                  }
                  onChange={(value) =>
                    updateCompany(
                      "tax_number",
                      value
                    )
                  }
                />

                <InputField
                  label="Company Email"
                  type="email"
                  value={
                    form.company.email ??
                    ""
                  }
                  placeholder="office@company.com"
                  onChange={(value) =>
                    updateCompany(
                      "email",
                      value
                    )
                  }
                />

                <InputField
                  label="Company Phone"
                  value={
                    form.company.phone ??
                    ""
                  }
                  placeholder="081234567890"
                  onChange={(value) =>
                    updateCompany(
                      "phone",
                      value
                    )
                  }
                />

                <InputField
                  label="Website"
                  type="url"
                  value={
                    form.company
                      .website ?? ""
                  }
                  placeholder="https://company.com"
                  onChange={(value) =>
                    updateCompany(
                      "website",
                      value
                    )
                  }
                />

                <InputField
                  label="Industry"
                  value={
                    form.company
                      .industry ?? ""
                  }
                  placeholder="Technology"
                  onChange={(value) =>
                    updateCompany(
                      "industry",
                      value
                    )
                  }
                />

                <InputField
                  label="Company Size"
                  value={
                    form.company
                      .company_size ?? ""
                  }
                  placeholder="11-50"
                  onChange={(value) =>
                    updateCompany(
                      "company_size",
                      value
                    )
                  }
                />

                <InputField
                  label="Default Currency"
                  value={
                    form.company
                      .default_currency
                  }
                  placeholder="IDR"
                  onChange={(value) =>
                    updateCompany(
                      "default_currency",
                      value.toUpperCase()
                    )
                  }
                />

                <InputField
                  label="Timezone"
                  value={
                    form.company.timezone
                  }
                  placeholder="Asia/Jakarta"
                  onChange={(value) =>
                    updateCompany(
                      "timezone",
                      value
                    )
                  }
                />

                <InputField
                  label="Fiscal Start Month"
                  type="number"
                  min={1}
                  max={12}
                  value={
                    form.company
                      .fiscal_year_start_month
                  }
                  onChange={(value) =>
                    updateCompany(
                      "fiscal_year_start_month",
                      Number(value || 1)
                    )
                  }
                />

                <InputField
                  label="Logo URL"
                  type="url"
                  value={
                    form.company
                      .logo_url ?? ""
                  }
                  onChange={(value) =>
                    updateCompany(
                      "logo_url",
                      value
                    )
                  }
                />

                <div className="md:col-span-2">
                  <InputField
                    label="Address"
                    value={
                      form.company
                        .address_line ?? ""
                    }
                    placeholder="Alamat lengkap perusahaan"
                    onChange={(value) =>
                      updateCompany(
                        "address_line",
                        value
                      )
                    }
                  />
                </div>

                <InputField
                  label="City"
                  value={
                    form.company.city ??
                    ""
                  }
                  onChange={(value) =>
                    updateCompany(
                      "city",
                      value
                    )
                  }
                />

                <InputField
                  label="Province"
                  value={
                    form.company
                      .province ?? ""
                  }
                  onChange={(value) =>
                    updateCompany(
                      "province",
                      value
                    )
                  }
                />

                <InputField
                  label="Country"
                  value={
                    form.company.country
                  }
                  onChange={(value) =>
                    updateCompany(
                      "country",
                      value
                    )
                  }
                />

                <InputField
                  label="Postal Code"
                  value={
                    form.company
                      .postal_code ?? ""
                  }
                  onChange={(value) =>
                    updateCompany(
                      "postal_code",
                      value
                    )
                  }
                />

                <SelectField
                  label="Status"
                  value={
                    form.company.status
                  }
                  onChange={(value) =>
                    updateCompany(
                      "status",
                      value as ProvisionCompanyInput["company"]["status"]
                    )
                  }
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                  <option value="suspended">
                    Suspended
                  </option>
                </SelectField>

                <SelectField
                  label="Is Active"
                  value={String(
                    form.company.is_active
                  )}
                  onChange={(value) =>
                    updateCompany(
                      "is_active",
                      value === "true"
                    )
                  }
                >
                  <option value="true">
                    Yes
                  </option>

                  <option value="false">
                    No
                  </option>
                </SelectField>
              </div>
            </div>
          )}

          {activeSection ===
            "owner" && (
            <div>
              <SectionHeader
                title="Owner Account"
                description="Akun utama pemilik company dengan akses penuh."
                icon={
                  <UserRound size={20} />
                }
              />

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <InputField
                  label="Full Name"
                  value={
                    form.owner.full_name
                  }
                  required
                  placeholder="Nama lengkap owner"
                  onChange={(value) =>
                    updateOwner(
                      "full_name",
                      value
                    )
                  }
                />

                <InputField
                  label="Email"
                  type="email"
                  value={
                    form.owner.email
                  }
                  required
                  placeholder="owner@company.com"
                  onChange={(value) =>
                    updateOwner(
                      "email",
                      value
                    )
                  }
                />

                <InputField
                  label="Phone"
                  value={
                    form.owner.phone ?? ""
                  }
                  placeholder="081234567890"
                  onChange={(value) =>
                    updateOwner(
                      "phone",
                      value
                    )
                  }
                />

                <InputField
                  label="Password"
                  type="password"
                  value={
                    form.owner.password
                  }
                  required
                  placeholder="Minimal 8 karakter"
                  onChange={(value) =>
                    updateOwner(
                      "password",
                      value
                    )
                  }
                />

                <InputField
                  label="Job Title"
                  value={
                    form.owner
                      .job_title ?? ""
                  }
                  placeholder="Chief Executive Officer"
                  onChange={(value) =>
                    updateOwner(
                      "job_title",
                      value
                    )
                  }
                />

                <InputField
                  label="Department"
                  value={
                    form.owner
                      .department_name ??
                    ""
                  }
                  placeholder="Management"
                  onChange={(value) =>
                    updateOwner(
                      "department_name",
                      value
                    )
                  }
                />

                <div className="md:col-span-2">
                  <InputField
                    label="Avatar URL"
                    type="url"
                    value={
                      form.owner
                        .avatar_url ?? ""
                    }
                    onChange={(value) =>
                      updateOwner(
                        "avatar_url",
                        value
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection ===
            "users" && (
            <div>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader
                  title="Additional Users"
                  description="Tambahkan akun Administrator atau Staff."
                  icon={
                    <UsersRound size={20} />
                  }
                />

                <button
                  type="button"
                  onClick={addUser}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300"
                >
                  <Plus size={16} />

                  Add User
                </button>
              </div>

              {form.users.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-800">
                  <UsersRound
                    size={32}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">
                    Belum ada user tambahan
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Owner tetap dibuat
                    meskipun tanpa user
                    tambahan.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.users.map(
                    (user, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a] sm:p-5"
                      >
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <h3 className="font-black text-slate-950 dark:text-white">
                              User {index + 1}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              Akun tambahan
                              company
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeUser(index)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="grid min-w-0 gap-4 md:grid-cols-2">
                          <InputField
                            label="Full Name"
                            value={
                              user.full_name
                            }
                            required
                            onChange={(value) =>
                              updateUser(
                                index,
                                "full_name",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Email"
                            type="email"
                            value={user.email}
                            required
                            onChange={(value) =>
                              updateUser(
                                index,
                                "email",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Phone"
                            value={
                              user.phone ?? ""
                            }
                            onChange={(value) =>
                              updateUser(
                                index,
                                "phone",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Password"
                            type="password"
                            value={
                              user.password
                            }
                            required
                            placeholder="Minimal 8 karakter"
                            onChange={(value) =>
                              updateUser(
                                index,
                                "password",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Job Title"
                            value={
                              user.job_title ??
                              ""
                            }
                            onChange={(value) =>
                              updateUser(
                                index,
                                "job_title",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Department"
                            value={
                              user
                                .department_name ??
                              ""
                            }
                            onChange={(value) =>
                              updateUser(
                                index,
                                "department_name",
                                value
                              )
                            }
                          />

                          <SelectField
                            label="Role"
                            value={
                              user.role_code
                            }
                            required
                            onChange={(value) =>
                              updateUser(
                                index,
                                "role_code",
                                value as ProvisionCompanyUserInput["role_code"]
                              )
                            }
                          >
                            <option value="admin">
                              Administrator
                            </option>

                            <option value="staff">
                              Staff
                            </option>
                          </SelectField>

                          <InputField
                            label="Avatar URL"
                            type="url"
                            value={
                              user.avatar_url ??
                              ""
                            }
                            onChange={(value) =>
                              updateUser(
                                index,
                                "avatar_url",
                                value
                              )
                            }
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection ===
            "branches" && (
            <div>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader
                  title="Additional Branches"
                  description="Head Office dengan kode HQ akan dibuat otomatis."
                  icon={
                    <GitBranch size={20} />
                  }
                />

                <button
                  type="button"
                  onClick={addBranch}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300"
                >
                  <Plus size={16} />

                  Add Branch
                </button>
              </div>

              {form.branches.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-800">
                  <GitBranch
                    size={32}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">
                    Belum ada branch tambahan
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Head Office akan dibuat
                    otomatis oleh backend.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.branches.map(
                    (
                      branch,
                      index
                    ) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a] sm:p-5"
                      >
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <h3 className="font-black text-slate-950 dark:text-white">
                              Branch{" "}
                              {index + 1}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              Cabang tambahan
                              company
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeBranch(
                                index
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="grid min-w-0 gap-4 md:grid-cols-2">
                          <InputField
                            label="Branch Code"
                            value={
                              branch.code
                            }
                            required
                            placeholder="JKT-01"
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "code",
                                value.toUpperCase()
                              )
                            }
                          />

                          <InputField
                            label="Branch Name"
                            value={
                              branch.name
                            }
                            required
                            placeholder="Cabang Jakarta"
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "name",
                                value
                              )
                            }
                          />

                          <SelectField
                            label="Branch Type"
                            value={
                              branch.branch_type
                            }
                            required
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "branch_type",
                                value as ProvisionCompanyBranchInput["branch_type"]
                              )
                            }
                          >
                            <option value="branch">
                              Branch
                            </option>

                            <option value="outlet">
                              Outlet
                            </option>

                            <option value="warehouse">
                              Warehouse
                            </option>
                          </SelectField>

                          <SelectField
                            label="Active"
                            value={String(
                              branch.is_active
                            )}
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "is_active",
                                value === "true"
                              )
                            }
                          >
                            <option value="true">
                              Active
                            </option>

                            <option value="false">
                              Inactive
                            </option>
                          </SelectField>

                          <InputField
                            label="Email"
                            type="email"
                            value={
                              branch.email ?? ""
                            }
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "email",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Phone"
                            value={
                              branch.phone ?? ""
                            }
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "phone",
                                value
                              )
                            }
                          />

                          <div className="md:col-span-2">
                            <InputField
                              label="Address"
                              value={
                                branch
                                  .address_line ??
                                ""
                              }
                              onChange={(value) =>
                                updateBranch(
                                  index,
                                  "address_line",
                                  value
                                )
                              }
                            />
                          </div>

                          <InputField
                            label="City"
                            value={
                              branch.city ?? ""
                            }
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "city",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Province"
                            value={
                              branch.province ??
                              ""
                            }
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "province",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Country"
                            value={
                              branch.country
                            }
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "country",
                                value
                              )
                            }
                          />

                          <InputField
                            label="Postal Code"
                            value={
                              branch
                                .postal_code ??
                              ""
                            }
                            onChange={(value) =>
                              updateBranch(
                                index,
                                "postal_code",
                                value
                              )
                            }
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {displayedError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {displayedError}
          </div>
        )}

        <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-bold text-slate-500">
              Step {currentIndex + 1} of{" "}
              {sections.length} ·{" "}
              {
                sections[
                  currentIndex
                ]?.description
              }
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                disabled={
                  createMutation.isPending
                }
                onClick={() =>
                  router.push(
                    "/companies"
                  )
                }
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Cancel
              </button>

              {currentIndex > 0 && (
                <button
                  type="button"
                  disabled={
                    createMutation.isPending
                  }
                  onClick={goBack}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <ChevronLeft size={16} />

                  Back
                </button>
              )}

              {currentIndex <
              sections.length - 1 ? (
                <button
                  type="button"
                  disabled={
                    createMutation.isPending
                  }
                  onClick={goNext}
                  className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50 sm:col-span-1"
                >
                  Next

                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending
                  }
                  className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
                >
                  {createMutation.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Creating...
                    </>
                  ) : (
                    <>
                      <Check size={16} />

                      Create Company
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}