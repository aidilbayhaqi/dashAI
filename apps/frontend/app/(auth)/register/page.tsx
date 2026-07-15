"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

import {
  getAuthApiError,
  getRegisterCompanies,
  register,
} from "@/features/auth/api";

import { cn } from "@/lib/utils";

import type {
  RegisterCompanyOption,
  RegisterPayload,
} from "@/types/backend";


import {
  companySizes,
  createInitialRegisterForm,
  getRegisterAccountType,
  industries,
  isValidRegisterEmail,
  type RegisterMode,
} from "@/features/auth/register/config";
import {
  RegisterFieldLabel,
  RegisterPasswordInput,
  RegisterSectionHeading,
  RegisterTextInput,
} from "@/features/auth/register/controls";

export default function RegisterPage() {
  const router = useRouter();

  const [
    mode,
    setMode,
  ] = useState<RegisterMode>(
    "company"
  );

  const [
    form,
    setForm,
  ] = useState<RegisterPayload>(
    createInitialRegisterForm()
  );

  const [
    companySearch,
    setCompanySearch,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  const [
    validationError,
    setValidationError,
  ] = useState<string | null>(
    null
  );


  const companiesQuery = useQuery({
    queryKey: [
      "auth",
      "register-companies",
    ],

    queryFn: () =>
      getRegisterCompanies(),

    enabled: mode === "user",

    retry: false,

    staleTime:
      60 * 1000,
  });


  const registerMutation =
    useMutation({
      mutationFn: register,

      onSuccess: () => {
        /*
         * API register menyimpan session
         * melalui setAuthSession().
         */
        router.replace(
          "/dashboard"
        );

        router.refresh();
      },
    });


  const companies =
    companiesQuery.data ?? [];


  const filteredCompanies =
    useMemo(() => {
      const keyword =
        companySearch
          .trim()
          .toLowerCase();

      if (!keyword) {
        return companies;
      }

      return companies.filter(
        (company) =>
          [
            company.name,
            company.legal_name,
            company.city,
            company.province,
            company.country,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(keyword)
            )
      );
    }, [
      companies,
      companySearch,
    ]);


  const selectedCompany =
    companies.find(
      (company) =>
        company.id ===
        form.company_id
    );


  function updateField<
    K extends keyof RegisterPayload,
  >(
    key: K,
    value: RegisterPayload[K]
  ) {
    setValidationError(null);

    if (registerMutation.isError) {
      registerMutation.reset();
    }

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }


  function changeMode(
    nextMode: RegisterMode
  ) {
    setMode(nextMode);
    setValidationError(null);
    registerMutation.reset();

    setForm((current) => ({
      ...current,

      account_type:
        getRegisterAccountType(
          nextMode
        ),

      company_id:
        nextMode === "user"
          ? current.company_id
          : "",
    }));
  }


  function validateForm(): boolean {
    if (
      form.full_name
        .trim()
        .length < 2
    ) {
      setValidationError(
        "Full name wajib diisi minimal 2 karakter."
      );

      return false;
    }

    if (!isValidRegisterEmail(form.email)) {
      setValidationError(
        "Format email akun tidak valid."
      );

      return false;
    }

    if (
      form.password.length < 8
    ) {
      setValidationError(
        "Password minimal 8 karakter."
      );

      return false;
    }

    if (
      form.password !==
      form.confirm_password
    ) {
      setValidationError(
        "Password dan konfirmasi password tidak sama."
      );

      return false;
    }

    if (mode === "company") {
      if (
        !form.company_name ||
        form.company_name
          .trim()
          .length < 2
      ) {
        setValidationError(
          "Company name wajib diisi minimal 2 karakter."
        );

        return false;
      }

      if (
        form.company_email &&
        !isValidRegisterEmail(
          form.company_email
        )
      ) {
        setValidationError(
          "Format company email tidak valid."
        );

        return false;
      }
    }

    if (mode === "user") {
      if (!form.company_id) {
        setValidationError(
          "Pilih company yang akan dihubungkan."
        );

        return false;
      }
    }

    if (!acceptedTerms) {
      setValidationError(
        "Kamu harus menyetujui syarat penggunaan DashAI."
      );

      return false;
    }

    return true;
  }


  function buildPayload():
    RegisterPayload {
    const commonPayload = {
      account_type:
        getRegisterAccountType(mode),

      full_name:
        form.full_name.trim(),

      email:
        form.email
          .trim()
          .toLowerCase(),

      phone:
        form.phone?.trim() ||
        undefined,

      password:
        form.password,

      confirm_password:
        form.confirm_password,
    };

    if (mode === "user") {
      return {
        ...commonPayload,

        company_id:
          form.company_id,

        job_title:
          form.job_title?.trim() ||
          undefined,

        department_name:
          form.department_name
            ?.trim() ||
          undefined,
      };
    }

    return {
      ...commonPayload,

      company_name:
        form.company_name
          ?.trim(),

      legal_name:
        form.legal_name
          ?.trim() ||
        undefined,

      company_email:
        form.company_email
          ?.trim()
          .toLowerCase() ||
        undefined,

      company_phone:
        form.company_phone
          ?.trim() ||
        undefined,

      company_industry:
        form.company_industry ||
        undefined,

      company_size:
        form.company_size ||
        undefined,

      address_line:
        form.address_line
          ?.trim() ||
        undefined,

      city:
        form.city?.trim() ||
        undefined,

      province:
        form.province?.trim() ||
        undefined,

      country:
        form.country?.trim() ||
        "Indonesia",

      postal_code:
        form.postal_code
          ?.trim() ||
        undefined,
    };
  }


  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setValidationError(null);
    registerMutation.reset();

    if (!validateForm()) {
      return;
    }

    registerMutation.mutate(
      buildPayload()
    );
  }


  const apiError =
    registerMutation.isError
      ? getAuthApiError(
          registerMutation.error
        )
      : null;


  const displayedError =
    validationError ||
    apiError;


  return (
    <main className="safe-area-top safe-area-bottom min-h-screen overflow-x-hidden bg-[#02040a] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[440px] w-[440px] rounded-full bg-blue-700/20 blur-3xl" />

        <div className="absolute right-[-160px] top-20 h-[420px] w-[420px] rounded-full bg-blue-950/40 blur-3xl" />

        <div className="absolute bottom-[-180px] left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-slate-700/10 blur-3xl" />
      </div>

      <section className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden flex-col justify-between border-r border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl lg:flex">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                <Sparkles size={21} />
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight">
                  DashAI
                </h1>

                <p className="text-xs font-semibold text-slate-500">
                  ERP + AI Business Workspace
                </p>
              </div>
            </div>

            <div className="mt-24 max-w-xl">
              <div className="mb-5 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                Company Registration
              </div>

              <h2 className="text-5xl font-black leading-tight tracking-tight">
                Start your ERP workspace
                with company-based access.
              </h2>

              <p className="mt-6 text-sm leading-7 text-slate-400">
                Buat company baru sebagai
                owner, atau daftar sebagai
                user pada company yang sudah
                terdaftar.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                icon: Building2,
                title:
                  "Company workspace",
                description:
                  "Data transaksi, user, role, branch, dan laporan dipisahkan berdasarkan company.",
              },
              {
                icon: Users,
                title: "User access",
                description:
                  "User bergabung dengan memilih company yang sudah terdaftar.",
              },
              {
                icon: ShieldCheck,
                title: "Secure role",
                description:
                  "User publik otomatis mendapatkan role Staff, bukan Admin.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                      <Icon size={20} />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-white">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex items-start justify-center px-4 py-6 sm:px-5 sm:py-10 lg:items-center">
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
                <Sparkles size={24} />
              </div>

              <h1 className="text-3xl font-black">
                DashAI
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Company-based ERP Registration
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-6"
            >
              <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                    <UserPlus size={22} />
                  </div>

                  <h2 className="text-2xl font-black tracking-tight">
                    Create account
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Daftar sebagai pemilik
                    company atau user dari
                    company yang sudah terdaftar.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="text-sm font-bold text-slate-400 transition hover:text-white"
                >
                  Already have account?
                </Link>
              </div>

              <div className="mb-7 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    changeMode("company")
                  }
                  className={cn(
                    "relative rounded-[1.35rem] border p-4 text-left transition",
                    mode === "company"
                      ? "border-blue-500 bg-blue-600/15"
                      : "border-white/10 bg-[#02040a] hover:bg-white/[0.04]"
                  )}
                >
                  {mode === "company" && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={14} />
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                        mode === "company"
                          ? "bg-blue-700 text-white"
                          : "bg-white/[0.06] text-slate-500"
                      )}
                    >
                      <BriefcaseBusiness
                        size={18}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-black text-white">
                        Register Company
                      </p>

                      <p className="mt-1 pr-5 text-xs leading-5 text-slate-500">
                        Buat company baru dan
                        satu akun owner.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeMode("user")
                  }
                  className={cn(
                    "relative rounded-[1.35rem] border p-4 text-left transition",
                    mode === "user"
                      ? "border-blue-500 bg-blue-600/15"
                      : "border-white/10 bg-[#02040a] hover:bg-white/[0.04]"
                  )}
                >
                  {mode === "user" && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={14} />
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                        mode === "user"
                          ? "bg-blue-700 text-white"
                          : "bg-white/[0.06] text-slate-500"
                      )}
                    >
                      <UserRound size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-black text-white">
                        Register User
                      </p>

                      <p className="mt-1 pr-5 text-xs leading-5 text-slate-500">
                        Pilih dan bergabung ke
                        company existing.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {mode === "company" ? (
                <section className="space-y-5">
                  <RegisterSectionHeading
                    title="Company Information"
                    description="Informasi company dan Head Office yang akan dibuat."
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <RegisterFieldLabel required>
                        Company Name
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.company_name ??
                          ""
                        }
                        required
                        placeholder="PT DashAI Teknologi"
                        icon={
                          <Building2
                            size={18}
                          />
                        }
                        onChange={(value) =>
                          updateField(
                            "company_name",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Legal Name
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.legal_name ??
                          ""
                        }
                        placeholder="PT DashAI Teknologi Indonesia"
                        onChange={(value) =>
                          updateField(
                            "legal_name",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Industry
                      </RegisterFieldLabel>

                      <select
                        value={
                          form.company_industry ??
                          "Technology"
                        }
                        onChange={(event) =>
                          updateField(
                            "company_industry",
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-2xl border border-white/10 bg-[#02040a] px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/70"
                      >
                        {industries.map(
                          (industry) => (
                            <option
                              key={industry}
                              value={industry}
                            >
                              {industry}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Company Size
                      </RegisterFieldLabel>

                      <select
                        value={
                          form.company_size ??
                          "1-10"
                        }
                        onChange={(event) =>
                          updateField(
                            "company_size",
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-2xl border border-white/10 bg-[#02040a] px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/70"
                      >
                        {companySizes.map(
                          (size) => (
                            <option
                              key={size}
                              value={size}
                            >
                              {size} employees
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Company Email
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        type="email"
                        value={
                          form.company_email ??
                          ""
                        }
                        placeholder="office@company.com"
                        icon={<Mail size={18} />}
                        onChange={(value) =>
                          updateField(
                            "company_email",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Company Phone
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.company_phone ??
                          ""
                        }
                        placeholder="021 12345678"
                        icon={
                          <Phone size={18} />
                        }
                        onChange={(value) =>
                          updateField(
                            "company_phone",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Country
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.country ??
                          "Indonesia"
                        }
                        placeholder="Indonesia"
                        onChange={(value) =>
                          updateField(
                            "country",
                            value
                          )
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <RegisterFieldLabel>
                        Address
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.address_line ??
                          ""
                        }
                        placeholder="Alamat lengkap company"
                        icon={
                          <MapPin size={18} />
                        }
                        onChange={(value) =>
                          updateField(
                            "address_line",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        City
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.city ?? ""
                        }
                        placeholder="Jakarta"
                        onChange={(value) =>
                          updateField(
                            "city",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Province
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.province ??
                          ""
                        }
                        placeholder="DKI Jakarta"
                        onChange={(value) =>
                          updateField(
                            "province",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Postal Code
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.postal_code ??
                          ""
                        }
                        placeholder="12345"
                        onChange={(value) =>
                          updateField(
                            "postal_code",
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                </section>
              ) : (
                <section className="space-y-5">
                  <RegisterSectionHeading
                    title="Company Access"
                    description="Pilih company yang sudah terdaftar. Akun akan dibuat sebagai Staff."
                  />

                  <div>
                    <RegisterFieldLabel>
                      Search Company
                    </RegisterFieldLabel>

                    <RegisterTextInput
                      value={companySearch}
                      placeholder="Cari nama atau lokasi company"
                      icon={
                        <Search size={18} />
                      }
                      onChange={
                        setCompanySearch
                      }
                    />
                  </div>

                  {companiesQuery.isLoading ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] p-4 text-sm text-slate-500">
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />

                      Memuat company...
                    </div>
                  ) : companiesQuery.isError ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                      <p className="text-sm font-semibold text-rose-200">
                        {getAuthApiError(
                          companiesQuery.error
                        )}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          void companiesQuery.refetch()
                        }
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-black text-rose-200"
                      >
                        <RefreshCw size={14} />
                        Coba lagi
                      </button>
                    </div>
                  ) : (
                    <div>
                      <RegisterFieldLabel required>
                        Registered Company
                      </RegisterFieldLabel>

                      <select
                        value={
                          form.company_id ??
                          ""
                        }
                        required
                        onChange={(event) =>
                          updateField(
                            "company_id",
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-2xl border border-white/10 bg-[#02040a] px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/70"
                      >
                        <option value="">
                          Pilih company
                        </option>

                        {filteredCompanies.map(
                          (
                            company: RegisterCompanyOption
                          ) => (
                            <option
                              key={company.id}
                              value={company.id}
                            >
                              {company.name}
                              {company.city
                                ? ` — ${company.city}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  {selectedCompany && (
                    <div className="rounded-[1.35rem] border border-blue-500/20 bg-blue-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
                          <Building2 size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-white">
                            {selectedCompany.name}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {[
                              selectedCompany.legal_name,
                              selectedCompany.city,
                              selectedCompany.province,
                              selectedCompany.country,
                            ]
                              .filter(Boolean)
                              .join(" • ") ||
                              "Company aktif"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <RegisterFieldLabel>
                        Job Title
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.job_title ??
                          ""
                        }
                        placeholder="Staff"
                        onChange={(value) =>
                          updateField(
                            "job_title",
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <RegisterFieldLabel>
                        Department
                      </RegisterFieldLabel>

                      <RegisterTextInput
                        value={
                          form.department_name ??
                          ""
                        }
                        placeholder="Operations"
                        onChange={(value) =>
                          updateField(
                            "department_name",
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                </section>
              )}

              <section className="mt-7 space-y-5 border-t border-white/10 pt-7">
                <RegisterSectionHeading
                  title={
                    mode === "company"
                      ? "Owner Account"
                      : "User Account"
                  }
                  description={
                    mode === "company"
                      ? "Akun ini akan menjadi owner dengan akses penuh."
                      : "Akun ini akan dihubungkan ke company yang dipilih."
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <RegisterFieldLabel required>
                      Full Name
                    </RegisterFieldLabel>

                    <RegisterTextInput
                      value={form.full_name}
                      required
                      autoComplete="name"
                      placeholder="Aidil Bayhaqi"
                      icon={
                        <UserRound
                          size={18}
                        />
                      }
                      onChange={(value) =>
                        updateField(
                          "full_name",
                          value
                        )
                      }
                    />
                  </div>

                  <div>
                    <RegisterFieldLabel required>
                      Account Email
                    </RegisterFieldLabel>

                    <RegisterTextInput
                      type="email"
                      value={form.email}
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                      icon={<Mail size={18} />}
                      onChange={(value) =>
                        updateField(
                          "email",
                          value
                        )
                      }
                    />
                  </div>

                  <div>
                    <RegisterFieldLabel>
                      Phone
                    </RegisterFieldLabel>

                    <RegisterTextInput
                      value={
                        form.phone ?? ""
                      }
                      autoComplete="tel"
                      placeholder="081234567890"
                      icon={
                        <Phone size={18} />
                      }
                      onChange={(value) =>
                        updateField(
                          "phone",
                          value
                        )
                      }
                    />
                  </div>

                  <div>
                    <RegisterFieldLabel required>
                      Password
                    </RegisterFieldLabel>

                    <RegisterPasswordInput
                      value={form.password}
                      visible={showPassword}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      onChange={(value) =>
                        updateField(
                          "password",
                          value
                        )
                      }
                      onToggle={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                    />
                  </div>

                  <div>
                    <RegisterFieldLabel required>
                      Confirm Password
                    </RegisterFieldLabel>

                    <RegisterPasswordInput
                      value={
                        form.confirm_password
                      }
                      visible={
                        showConfirmPassword
                      }
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      onChange={(value) =>
                        updateField(
                          "confirm_password",
                          value
                        )
                      }
                      onToggle={() =>
                        setShowConfirmPassword(
                          (current) =>
                            !current
                        )
                      }
                    />
                  </div>
                </div>
              </section>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[1.35rem] border border-white/10 bg-[#02040a] p-4">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(
                      event.target.checked
                    );

                    setValidationError(
                      null
                    );
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent"
                />

                <span className="text-xs leading-5 text-slate-500">
                  Saya menyetujui syarat
                  penggunaan dan kebijakan
                  privasi DashAI.
                </span>
              </label>

              {displayedError && (
                <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold leading-6 text-rose-200">
                  {displayedError}
                </div>
              )}

              <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-[#02040a] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-blue-400"
                  />

                  <p className="text-xs leading-5 text-slate-500">
                    {mode === "company"
                      ? "Company, Head Office, role Owner, Admin, Staff, dan akun owner akan dibuat dalam satu proses."
                      : "Akun akan mendapatkan role Staff dan akses ke Head Office company yang dipilih."}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  registerMutation.isPending
                }
                className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registerMutation.isPending ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />

                    Creating account...
                  </>
                ) : (
                  <>
                    {mode === "company"
                      ? "Create Company Workspace"
                      : "Register as Company User"}

                    <ArrowRight
                      size={17}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs font-semibold text-slate-600">
              © 2026 DashAI. Company-based ERP registration.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}