"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useState,
  type FormEvent,
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
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
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

import {
  companyCreateSections,
  createEmptyCompanyBranch,
  createEmptyCompanyUser,
  createInitialCompanyForm,
} from "./company-create/defaults";
import { CompanyBranchesSection } from "./company-create/sections/branches-section";
import { CompanyInformationSection } from "./company-create/sections/company-section";
import { CompanyOwnerSection } from "./company-create/sections/owner-section";
import { CompanyUsersSection } from "./company-create/sections/users-section";
import type { CompanyCreateSectionKey } from "./company-create/types";
import { isValidCompanyEmail } from "./company-create/validation";

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
    createInitialCompanyForm()
  );

  const [
    activeSection,
    setActiveSection,
  ] = useState<CompanyCreateSectionKey>(
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

      onError: (error: unknown) => {
        setRequestError(
          getCompanyApiError(error)
        );
      },
    });

  const currentIndex =
    companyCreateSections.findIndex(
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
        createEmptyCompanyUser(),
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
        createEmptyCompanyBranch(),
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
      !isValidCompanyEmail(
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
      !isValidCompanyEmail(
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
        !isValidCompanyEmail(user.email)
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
        !isValidCompanyEmail(
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
      companyCreateSections[
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
      companyCreateSections[
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
            {companyCreateSections.length}
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="min-w-0 space-y-6"
      >
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-2xl dark:border-slate-900 dark:bg-[#050816]/90 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {companyCreateSections.map(
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
          {activeSection === "company" ? (
            <CompanyInformationSection
              company={form.company}
              updateCompany={updateCompany}
            />
          ) : null}

          {activeSection === "owner" ? (
            <CompanyOwnerSection
              owner={form.owner}
              updateOwner={updateOwner}
            />
          ) : null}

          {activeSection === "users" ? (
            <CompanyUsersSection
              users={form.users}
              addUser={addUser}
              removeUser={removeUser}
              updateUser={updateUser}
            />
          ) : null}

          {activeSection === "branches" ? (
            <CompanyBranchesSection
              branches={form.branches}
              addBranch={addBranch}
              removeBranch={removeBranch}
              updateBranch={updateBranch}
            />
          ) : null}
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
              {companyCreateSections.length} ·{" "}
              {
                companyCreateSections[
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
              companyCreateSections.length - 1 ? (
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