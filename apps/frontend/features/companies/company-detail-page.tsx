"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  Edit3,
  GitBranch,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { ModuleDeleteDialog } from "@/components/modules/module-delete-dialog";
import {
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";

import {
  deleteCompany,
  getCompanyApiError,
  getCompanyDetail,
  updateCompany,
} from "./api";

import type {
  CompanyDetail,
  CompanyStatus,
  CompanyUpdateInput,
} from "./types";


type DetailTab =
  | "company"
  | "users"
  | "branches";


type EditForm = {
  name: string;
  legal_name: string;
  tax_number: string;

  email: string;
  phone: string;
  website: string;

  industry: string;
  company_size: string;

  address_line: string;
  city: string;
  province: string;
  country: string;
  postal_code: string;

  default_currency: string;
  timezone: string;
  fiscal_year_start_month: number;

  logo_url: string;

  status: CompanyStatus;
  is_active: boolean;
};


const emptyForm: EditForm = {
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
};


function mapDetailToForm(
  detail: CompanyDetail
): EditForm {
  const company = detail.company;

  return {
    name:
      company.name ?? "",

    legal_name:
      company.legal_name ?? "",

    tax_number:
      company.tax_number ?? "",

    email:
      company.email ?? "",

    phone:
      company.phone ?? "",

    website:
      company.website ?? "",

    industry:
      company.industry ?? "",

    company_size:
      company.company_size ?? "",

    address_line:
      company.address_line ?? "",

    city:
      company.city ?? "",

    province:
      company.province ?? "",

    country:
      company.country || "Indonesia",

    postal_code:
      company.postal_code ?? "",

    default_currency:
      company.default_currency || "IDR",

    timezone:
      company.timezone || "Asia/Jakarta",

    fiscal_year_start_month:
      company.fiscal_year_start_month || 1,

    logo_url:
      company.logo_url ?? "",

    status:
      company.status || "active",

    is_active:
      company.is_active,
  };
}


function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}


function initials(
  value: string
): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
    )
    .join("");
}


function getStatusClass(
  status: string
): string {
  if (status === "active") {
    return [
      "bg-emerald-100",
      "text-emerald-700",
      "dark:bg-emerald-500/15",
      "dark:text-emerald-300",
    ].join(" ");
  }

  if (status === "suspended") {
    return [
      "bg-amber-100",
      "text-amber-700",
      "dark:bg-amber-500/15",
      "dark:text-amber-300",
    ].join(" ");
  }

  return [
    "bg-slate-100",
    "text-slate-600",
    "dark:bg-slate-800",
    "dark:text-slate-300",
  ].join(" ");
}


function InputField({
  label,
  value,
  type = "text",
  required = false,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string | number;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  onChange: (
    value: string
  ) => void;
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
        min={min}
        max={max}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#02040a] dark:text-white"
      />
    </label>
  );
}


function SelectField({
  label,
  value,
  children,
  onChange,
}: {
  label: string;
  value: string;
  children: ReactNode;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#02040a] dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}


function InformationItem({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a]">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-bold text-slate-800 dark:text-slate-200">
        {value || "-"}
      </div>
    </div>
  );
}


export function CompanyDetailPage() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const queryClient =
    useQueryClient();

  const companyId =
    searchParams
      .get("companyId")
      ?.trim() ?? "";

  const [
    accessChecked,
    setAccessChecked,
  ] = useState(false);

  const [
    isSuperAdmin,
    setIsSuperAdmin,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] = useState<DetailTab>(
    "company"
  );

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<EditForm>(
    emptyForm
  );

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null
  );

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] = useState(false);

  const [
    deleteError,
    setDeleteError,
  ] = useState<string | null>(
    null
  );


  useEffect(() => {
    setIsSuperAdmin(
      isCurrentUserSuperAdmin()
    );

    setAccessChecked(true);
  }, []);


  const detailQuery = useQuery({
    queryKey: [
      "companies",
      "detail",
      companyId,
    ],

    queryFn: () =>
      getCompanyDetail(companyId),

    enabled:
      accessChecked &&
      isSuperAdmin &&
      Boolean(companyId),

    retry: false,
  });


  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    setForm(
      mapDetailToForm(
        detailQuery.data
      )
    );
  }, [detailQuery.data]);


  const updateMutation =
    useMutation({
      mutationFn: (
        payload: CompanyUpdateInput
      ) =>
        updateCompany(
          companyId,
          payload
        ),

      onSuccess: async () => {
        setFormError(null);
        setEditing(false);

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "companies",
              "detail",
              companyId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "companies",
              "list",
            ],
          }),
        ]);
      },

      onError: (error) => {
        setFormError(
          getCompanyApiError(error)
        );
      },
    });


  const deleteMutation =
    useMutation({
      mutationFn: () =>
        deleteCompany(companyId),

      onSuccess: async () => {
        setDeleteError(null);
        setDeleteDialogOpen(false);

        queryClient.removeQueries({
          queryKey: [
            "companies",
            "detail",
            companyId,
          ],
        });

        await queryClient.invalidateQueries({
          queryKey: [
            "companies",
            "list",
          ],
        });

        router.replace("/companies");
      },

      onError: (error) => {
        setDeleteError(
          getCompanyApiError(error)
        );
      },
    });


  function updateForm<
    K extends keyof EditForm,
  >(
    key: K,
    value: EditForm[K]
  ) {
    setFormError(null);

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }


  function cancelEditing() {
    if (detailQuery.data) {
      setForm(
        mapDetailToForm(
          detailQuery.data
        )
      );
    }

    setFormError(null);
    setEditing(false);
  }


  async function handleUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      form.name.trim().length < 2
    ) {
      setFormError(
        "Company Name wajib diisi minimal 2 karakter."
      );

      return;
    }

    if (
      form.fiscal_year_start_month < 1 ||
      form.fiscal_year_start_month > 12
    ) {
      setFormError(
        "Fiscal Start Month harus antara 1 sampai 12."
      );

      return;
    }

    const payload: CompanyUpdateInput = {
      name: form.name,

      legal_name:
        form.legal_name,

      tax_number:
        form.tax_number,

      email:
        form.email,

      phone:
        form.phone,

      website:
        form.website,

      industry:
        form.industry,

      company_size:
        form.company_size,

      address_line:
        form.address_line,

      city:
        form.city,

      province:
        form.province,

      country:
        form.country,

      postal_code:
        form.postal_code,

      default_currency:
        form.default_currency,

      timezone:
        form.timezone,

      fiscal_year_start_month:
        form.fiscal_year_start_month,

      logo_url:
        form.logo_url,

      status:
        form.status,

      is_active:
        form.is_active,
    };

    try {
      await updateMutation.mutateAsync(
        payload
      );
    } catch {
      // Error ditampilkan melalui mutation.
    }
  }


  if (!accessChecked) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />

        <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />
      </div>
    );
  }


  if (!isSuperAdmin) {
    return (
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            <ShieldAlert size={22} />
          </div>

          <div>
            <h1 className="text-xl font-black text-rose-900 dark:text-rose-200">
              Superadmin Only
            </h1>

            <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
              Anda tidak memiliki akses
              ke detail company.
            </p>
          </div>
        </div>
      </section>
    );
  }


  if (!companyId) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() =>
            router.push("/companies")
          }
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold dark:border-slate-800"
        >
          <ArrowLeft size={17} />
          Kembali
        </button>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          Company ID tidak ditemukan pada URL.
        </div>
      </div>
    );
  }


  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />

        <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />
      </div>
    );
  }


  if (
    detailQuery.isError ||
    !detailQuery.data
  ) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() =>
            router.push("/companies")
          }
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold dark:border-slate-800"
        >
          <ArrowLeft size={17} />
          Kembali
        </button>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {getCompanyApiError(
            detailQuery.error
          )}
        </div>
      </div>
    );
  }


  const detail =
    detailQuery.data;

  const company =
    detail.company;

  const location = [
    company.city,
    company.province,
    company.country,
  ]
    .filter(Boolean)
    .join(", ");


  return (
    <div className="min-w-0 space-y-6 pb-12">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <button
                type="button"
                onClick={() =>
                  router.push("/companies")
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#02040a] dark:text-slate-300"
              >
                <ArrowLeft size={19} />
              </button>

              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f2a5f] text-lg font-black text-white">
                  {initials(company.name) || (
                    <Building2 size={22} />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                    Administration / Companies
                  </p>

                  <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {company.name}
                  </h1>

                  <p className="mt-1 break-words text-sm text-slate-500">
                    {company.legal_name ||
                      "Company tenant"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(
                        company.status
                      )}`}
                    >
                      {company.status}
                    </span>

                    {company.industry && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {company.industry}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#02040a]">
                <div className="text-xs font-bold uppercase text-slate-400">
                  Users
                </div>

                <div className="mt-1 text-xl font-black">
                  {detail.users_count}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#02040a]">
                <div className="text-xs font-bold uppercase text-slate-400">
                  Branches
                </div>

                <div className="mt-1 text-xl font-black">
                  {detail.branches_count}
                </div>
              </div>

              {!editing && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteDialogOpen(true);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 size={17} />
                    Delete
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("company");
                      setEditing(true);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-[#0f2a5f] dark:bg-white dark:text-slate-950"
                  >
                    <Edit3 size={17} />
                    Edit Company
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setActiveTab("company")
            }
            className={[
              "flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black transition",
              activeTab === "company"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#02040a] dark:text-slate-300",
            ].join(" ")}
          >
            <Building2 size={17} />
            Company
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setActiveTab("users");
            }}
            className={[
              "flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black transition",
              activeTab === "users"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#02040a] dark:text-slate-300",
            ].join(" ")}
          >
            <UsersRound size={17} />
            Users ({detail.users_count})
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setActiveTab("branches");
            }}
            className={[
              "flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black transition",
              activeTab === "branches"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#02040a] dark:text-slate-300",
            ].join(" ")}
          >
            <GitBranch size={17} />
            Branches ({detail.branches_count})
          </button>
        </div>
      </section>

      {activeTab === "company" &&
        !editing && (
          <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90 sm:p-6">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">
              Company Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Profil dan pengaturan utama company.
            </p>

            <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InformationItem
                label="Company Name"
                value={company.name}
                icon={<Building2 size={14} />}
              />

              <InformationItem
                label="Legal Name"
                value={company.legal_name}
              />

              <InformationItem
                label="NPWP / Tax Number"
                value={company.tax_number}
              />

              <InformationItem
                label="Email"
                value={company.email}
                icon={<Mail size={14} />}
              />

              <InformationItem
                label="Phone"
                value={company.phone}
                icon={<Phone size={14} />}
              />

              <InformationItem
                label="Website"
                value={company.website}
                icon={<Globe2 size={14} />}
              />

              <InformationItem
                label="Industry"
                value={company.industry}
              />

              <InformationItem
                label="Company Size"
                value={company.company_size}
              />

              <InformationItem
                label="Location"
                value={location}
                icon={<MapPin size={14} />}
              />

              <InformationItem
                label="Address"
                value={company.address_line}
              />

              <InformationItem
                label="Postal Code"
                value={company.postal_code}
              />

              <InformationItem
                label="Currency"
                value={company.default_currency}
              />

              <InformationItem
                label="Timezone"
                value={company.timezone}
              />

              <InformationItem
                label="Fiscal Start Month"
                value={String(
                  company.fiscal_year_start_month
                )}
              />

              <InformationItem
                label="Created"
                value={formatDate(
                  company.created_at
                )}
                icon={<CalendarDays size={14} />}
              />

              <InformationItem
                label="Updated"
                value={formatDate(
                  company.updated_at
                )}
              />

              <InformationItem
                label="Active"
                value={
                  company.is_active
                    ? "Yes"
                    : "No"
                }
                icon={<Check size={14} />}
              />
            </div>
          </section>
        )}

      {activeTab === "company" &&
        editing && (
          <form
            onSubmit={handleUpdate}
            className="space-y-5"
          >
            <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">
                    Update Company
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Ubah profil dan pengaturan company.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold dark:border-slate-800"
                >
                  <X size={16} />
                  Cancel Edit
                </button>
              </div>

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <InputField
                  label="Company Name"
                  value={form.name}
                  required
                  onChange={(value) =>
                    updateForm("name", value)
                  }
                />

                <InputField
                  label="Legal Name"
                  value={form.legal_name}
                  onChange={(value) =>
                    updateForm(
                      "legal_name",
                      value
                    )
                  }
                />

                <InputField
                  label="NPWP / Tax Number"
                  value={form.tax_number}
                  onChange={(value) =>
                    updateForm(
                      "tax_number",
                      value
                    )
                  }
                />

                <InputField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(value) =>
                    updateForm("email", value)
                  }
                />

                <InputField
                  label="Phone"
                  value={form.phone}
                  onChange={(value) =>
                    updateForm("phone", value)
                  }
                />

                <InputField
                  label="Website"
                  type="url"
                  value={form.website}
                  onChange={(value) =>
                    updateForm(
                      "website",
                      value
                    )
                  }
                />

                <InputField
                  label="Industry"
                  value={form.industry}
                  onChange={(value) =>
                    updateForm(
                      "industry",
                      value
                    )
                  }
                />

                <InputField
                  label="Company Size"
                  value={form.company_size}
                  onChange={(value) =>
                    updateForm(
                      "company_size",
                      value
                    )
                  }
                />

                <InputField
                  label="Currency"
                  value={form.default_currency}
                  onChange={(value) =>
                    updateForm(
                      "default_currency",
                      value.toUpperCase()
                    )
                  }
                />

                <InputField
                  label="Timezone"
                  value={form.timezone}
                  onChange={(value) =>
                    updateForm(
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
                    form.fiscal_year_start_month
                  }
                  onChange={(value) =>
                    updateForm(
                      "fiscal_year_start_month",
                      Number(value || 1)
                    )
                  }
                />

                <InputField
                  label="Logo URL"
                  type="url"
                  value={form.logo_url}
                  onChange={(value) =>
                    updateForm(
                      "logo_url",
                      value
                    )
                  }
                />

                <div className="md:col-span-2">
                  <InputField
                    label="Address"
                    value={form.address_line}
                    onChange={(value) =>
                      updateForm(
                        "address_line",
                        value
                      )
                    }
                  />
                </div>

                <InputField
                  label="City"
                  value={form.city}
                  onChange={(value) =>
                    updateForm("city", value)
                  }
                />

                <InputField
                  label="Province"
                  value={form.province}
                  onChange={(value) =>
                    updateForm(
                      "province",
                      value
                    )
                  }
                />

                <InputField
                  label="Country"
                  value={form.country}
                  onChange={(value) =>
                    updateForm(
                      "country",
                      value
                    )
                  }
                />

                <InputField
                  label="Postal Code"
                  value={form.postal_code}
                  onChange={(value) =>
                    updateForm(
                      "postal_code",
                      value
                    )
                  }
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) =>
                    updateForm(
                      "status",
                      value as CompanyStatus
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
                    form.is_active
                  )}
                  onChange={(value) =>
                    updateForm(
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
            </section>

            {formError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {formError}
              </div>
            )}

            <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    updateMutation.isPending
                  }
                  onClick={cancelEditing}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold disabled:opacity-50 dark:border-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    updateMutation.isPending
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </section>
          </form>
        )}

      {activeTab === "users" && (
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90 sm:p-6">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            Company Users
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Owner, administrator, dan staff company.
          </p>

          {detail.users.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-800">
              Belum ada user company.
            </div>
          ) : (
            <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {detail.users.map((user) => (
                <article
                  key={user.id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                      {initials(
                        user.full_name
                      ) || (
                        <UserRound size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-black text-slate-950 dark:text-white">
                          {user.full_name}
                        </h3>

                        {user.is_owner && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            <ShieldCheck size={11} />
                            Owner
                          </span>
                        )}
                      </div>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {user.role_name}
                    </span>

                    {user.job_title && (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {user.job_title}
                      </span>
                    )}

                    {user.department_name && (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {user.department_name}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
                    Last login:{" "}
                    {user.last_login_at
                      ? formatDate(
                          user.last_login_at
                        )
                      : "Belum pernah login"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "branches" && (
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]/90 sm:p-6">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            Company Branches
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Head Office dan branch tambahan company.
          </p>

          {detail.branches.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-800">
              Belum ada branch company.
            </div>
          ) : (
            <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {detail.branches.map((branch) => (
                <article
                  key={branch.id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#02040a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-black text-slate-950 dark:text-white">
                        {branch.name}
                      </h3>

                      <p className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                        {branch.code}
                      </p>
                    </div>

                    {branch.is_head_office && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        Head Office
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800">
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={15}
                        className="mt-0.5 shrink-0"
                      />

                      <span className="break-words">
                        {[
                          branch.address_line,
                          branch.city,
                          branch.province,
                          branch.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail
                        size={15}
                        className="shrink-0"
                      />

                      <span className="min-w-0 break-all">
                        {branch.email || "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone
                        size={15}
                        className="shrink-0"
                      />

                      <span>
                        {branch.phone || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {branch.branch_type}
                    </span>

                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase",
                        branch.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {branch.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <ModuleDeleteDialog
        open={deleteDialogOpen}
        moduleTitle="Company"
        row={{ ...company }}
        isDeleting={deleteMutation.isPending}
        error={deleteError}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteDialogOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={() =>
          deleteMutation.mutateAsync()
        }
      />
    </div>
  );
}