"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { DashAILogo } from "@/components/brand/dashai-logo";
import { getAuthApiError, login } from "@/features/auth/api";

const highlights = [
  {
    icon: Building2,
    title: "Multi-company",
    description: "Kelola beberapa entity bisnis dalam satu workspace.",
  },
  {
    icon: BarChart3,
    title: "Smart reporting",
    description: "Finance, HR, CRM, dan inventory dalam satu dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Role access",
    description: "Kontrol akses user berdasarkan role dan permission.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      router.replace("/dashboard");
      router.refresh();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || loginMutation.isPending) {
      return;
    }

    loginMutation.mutate({
      email: normalizedEmail,
      password,
    });
  }

  const loginError = loginMutation.isError
    ? getAuthApiError(loginMutation.error)
    : null;

  return (
    <main className="auth-page safe-area-top safe-area-bottom min-h-screen overflow-x-hidden bg-[#02040a] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-140px] top-[-140px] h-[420px] w-[420px] rounded-full bg-blue-700/[0.18] blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-950/[0.35] blur-3xl" />
      </div>

      <section className="relative grid min-h-screen lg:grid-cols-[1fr_0.92fr]">
        <aside className="hidden flex-col justify-between p-10 lg:flex xl:p-14">
          <div>
            <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 backdrop-blur-2xl">
              <DashAILogo showText priority />
            </div>

            <div className="mt-24 max-w-2xl">
              <div className="mb-5 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                Enterprise Operating System
              </div>

              <h1 className="text-5xl font-black leading-tight tracking-tight">
                A cleaner way to control your business operations.
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400">
                DashAI menyatukan ERP, reporting, automation, dan business
                intelligence dalam satu workspace yang aman dan terukur.
              </p>
            </div>
          </div>

          <div className="grid max-w-4xl grid-cols-3 gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-2xl"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                    <Icon size={20} />
                  </div>
                  <h2 className="mt-4 text-sm font-black text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex items-center justify-center px-4 py-7 sm:px-6 sm:py-10">
          <div className="w-full max-w-md">
            <div className="mb-7 flex justify-center lg:hidden">
              <DashAILogo
                size={56}
                showText
                priority
                className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3"
              />
            </div>

            <form
              onSubmit={handleSubmit}
              className="auth-card rounded-[1.75rem] border border-white/10 bg-slate-950/[0.72] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:rounded-[2rem] sm:p-7"
            >
              <div className="mb-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-600/15 text-blue-300">
                  <ShieldCheck size={22} />
                </div>

                <h2 className="text-2xl font-black tracking-tight">
                  Sign in to workspace
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Masuk menggunakan akun yang terhubung ke company DashAI.
                </p>
              </div>

              {loginError ? (
                <div
                  role="alert"
                  className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200"
                >
                  {loginError}
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500"
                  >
                    Email
                  </label>

                  <div className="auth-field flex h-12 items-center gap-3 rounded-2xl border border-white/10 px-4 transition">
                    <Mail size={18} className="shrink-0 text-slate-600" />
                    <input
                      id="login-email"
                      data-auth-input
                      type="email"
                      value={email}
                      autoComplete="email"
                      onChange={(event) => setEmail(event.target.value)}
                      className="auth-input h-full w-full min-w-0 border-0 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
                      placeholder="nama@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500"
                  >
                    Password
                  </label>

                  <div className="auth-field flex h-12 items-center gap-3 rounded-2xl border border-white/10 px-4 transition">
                    <LockKeyhole
                      size={18}
                      className="shrink-0 text-slate-600"
                    />
                    <input
                      id="login-password"
                      data-auth-input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      autoComplete="current-password"
                      onChange={(event) => setPassword(event.target.value)}
                      className="auth-input h-full w-full min-w-0 border-0 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
                      placeholder="Masukkan password"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      onClick={() => setShowPassword((current) => !current)}
                      className="shrink-0 rounded-lg p-1 text-slate-600 transition hover:bg-white/5 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      className="auth-checkbox h-4 w-4 rounded border-white/15"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    className="text-sm font-bold text-slate-400 transition hover:text-white"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending || !email.trim() || !password}
                  className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  <ArrowRight
                    size={17}
                    className="transition group-hover:translate-x-0.5"
                  />
                </button>
              </div>

              <p className="mt-6 text-center text-sm font-semibold text-slate-500">
                Belum punya akun?{" "}
                <Link
                  href="/register"
                  className="font-black text-blue-400 transition hover:text-blue-300"
                >
                  Daftar sekarang
                </Link>
              </p>
            </form>

            <p className="mt-6 text-center text-xs font-semibold text-slate-600">
              © 2026 DashAI. Built for modern ERP operations.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
