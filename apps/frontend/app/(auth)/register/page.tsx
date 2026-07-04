"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

import { register } from "@/features/auth/api";
import { cn } from "@/lib/utils";

type RegisterMode = "company" | "user";
type RegisterAccountType = "company_owner" | "company_user";

const companySizes = ["1-10", "11-50", "51-200", "201-500", "500+"];

const industries = [
  "Technology",
  "Retail",
  "Manufacturing",
  "Education",
  "Healthcare",
  "Finance",
  "Services",
  "Other",
];

const userRoles = [
  "Staff",
  "Manager",
  "Finance Staff",
  "HR Staff",
  "CRM Staff",
  "Inventory Staff",
  "Admin",
];

function getAccountType(mode: RegisterMode): RegisterAccountType {
  return mode === "company" ? "company_owner" : "company_user";
}

export default function RegisterPage() {
  const router = useRouter();

  const [mode, setMode] = useState<RegisterMode>("company");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("Technology");
  const [companySize, setCompanySize] = useState("1-10");
  const [userRole, setUserRole] = useState("Staff");

  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    registerMutation.mutate({
      account_type: getAccountType(mode),
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      company_name: companyName.trim(),
      company_industry: mode === "company" ? companyIndustry : undefined,
      company_size: mode === "company" ? companySize : undefined,
      user_role: mode === "user" ? userRole : "Owner",
    });
  }

  return (
    <main className="min-h-screen bg-[#02040a] text-white">
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
                <h1 className="text-xl font-black tracking-tight">DashAI</h1>
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
                Start your ERP workspace with company-based access.
              </h2>

              <p className="mt-6 text-sm leading-7 text-slate-400">
                Setiap user di DashAI harus terhubung dengan nama perusahaan.
                Kamu bisa membuat company baru sebagai owner, atau daftar sebagai
                user yang terhubung ke perusahaan existing.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                icon: Building2,
                title: "Company workspace",
                description:
                  "Setiap transaksi, user, role, dan laporan berada dalam konteks perusahaan.",
              },
              {
                icon: Users,
                title: "User access",
                description:
                  "User dapat bergabung menggunakan nama perusahaan yang sama.",
              },
              {
                icon: ShieldCheck,
                title: "Role ready",
                description:
                  "Siap dikembangkan ke role-based access control di backend.",
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

        <div className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
                <Sparkles size={24} />
              </div>
              <h1 className="text-3xl font-black">DashAI</h1>
              <p className="mt-2 text-sm text-slate-500">
                Company-based ERP Registration
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl"
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
                    Daftar sebagai pemilik usaha atau user yang terhubung ke
                    nama perusahaan.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="text-sm font-bold text-slate-400 transition hover:text-white"
                >
                  Already have account?
                </Link>
              </div>

              <div className="mb-6 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("company")}
                  className={cn(
                    "rounded-[1.35rem] border p-4 text-left transition",
                    mode === "company"
                      ? "border-blue-500 bg-blue-600/15"
                      : "border-white/10 bg-[#02040a] hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl",
                        mode === "company"
                          ? "bg-blue-700 text-white"
                          : "bg-white/[0.06] text-slate-500"
                      )}
                    >
                      <BriefcaseBusiness size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-black text-white">
                        Register Company
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Buat perusahaan baru dan akun owner/admin.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("user")}
                  className={cn(
                    "rounded-[1.35rem] border p-4 text-left transition",
                    mode === "user"
                      ? "border-blue-500 bg-blue-600/15"
                      : "border-white/10 bg-[#02040a] hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl",
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
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Daftar user dan hubungkan ke nama perusahaan.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {registerMutation.isError ? (
                <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                  Register gagal. Pastikan backend aktif dan endpoint register
                  sudah dibuat.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Full Name
                  </label>

                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#02040a] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-700 focus:border-blue-500/70"
                    placeholder="Aidil Bayhaqi"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Email
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] px-4 transition focus-within:border-blue-500/70">
                    <Mail size={18} className="text-slate-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Password
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] px-4 transition focus-within:border-blue-500/70">
                    <LockKeyhole size={18} className="text-slate-600" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
                      placeholder="Minimum 6 characters"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="text-slate-600 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Company Name
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] px-4 transition focus-within:border-blue-500/70">
                    <Building2 size={18} className="text-slate-600" />
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
                      placeholder="PT DashAI Teknologi"
                    />
                  </div>
                </div>

                {mode === "company" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Industry
                      </label>

                      <select
                        value={companyIndustry}
                        onChange={(e) => setCompanyIndustry(e.target.value)}
                        className="h-12 w-full rounded-2xl border border-white/10 bg-[#02040a] px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/70"
                      >
                        {industries.map((industry) => (
                          <option key={industry} value={industry}>
                            {industry}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Company Size
                      </label>

                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="h-12 w-full rounded-2xl border border-white/10 bg-[#02040a] px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/70"
                      >
                        {companySizes.map((size) => (
                          <option key={size} value={size}>
                            {size} employees
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      User Role
                    </label>

                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#02040a] px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/70"
                    >
                      {userRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-[#02040a] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-blue-400"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    {mode === "company"
                      ? "Akun ini akan menjadi owner/admin untuk perusahaan yang didaftarkan."
                      : "Akun ini akan dicari dan dihubungkan berdasarkan nama perusahaan yang kamu masukkan."}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registerMutation.isPending
                  ? "Creating account..."
                  : mode === "company"
                    ? "Create Company Workspace"
                    : "Register as Company User"}

                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-0.5"
                />
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