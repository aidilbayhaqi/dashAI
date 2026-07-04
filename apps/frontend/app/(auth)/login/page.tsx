"use client";

import { useState } from "react";
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
  Sparkles,
} from "lucide-react";
import { login } from "@/features/auth/api";
import Link from "next/link";

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

  const [email, setEmail] = useState("superadmin@dashai.test");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
  mutationFn: login,
  onSuccess: () => {
    router.push("/dashboard");
  },
});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    loginMutation.mutate({
      email,
      password,
    });
  }

  return (
    <main className="min-h-screen bg-[#02040a] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-140px] top-[-140px] h-[420px] w-[420px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-blue-950/30 blur-3xl" />
      </div>

      <section className="relative grid min-h-screen lg:grid-cols-[1fr_0.92fr]">
        <div className="hidden flex-col justify-between p-10 lg:flex">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-2xl">
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

            <div className="mt-24 max-w-2xl">
              <div className="mb-5 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                Enterprise Operating System
              </div>

              <h2 className="text-5xl font-black leading-tight tracking-tight">
                A cleaner way to control your business operations.
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400">
                DashAI menyatukan ERP, reporting, import/export data, dan
                business intelligence dalam satu dashboard yang clean, scalable,
                dan siap dikembangkan.
              </p>
            </div>
          </div>

          <div className="grid max-w-4xl grid-cols-3 gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-2xl"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-black text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
                <Sparkles size={24} />
              </div>
              <h1 className="text-3xl font-black">DashAI</h1>
              <p className="mt-2 text-sm text-slate-500">
                ERP + AI Business Workspace
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            >
              <div className="mb-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <ShieldCheck size={22} />
                </div>

                <h2 className="text-2xl font-black tracking-tight">
                  Sign in to workspace
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Masuk untuk mengelola dashboard ERP DashAI.
                </p>
                <div className="mt-5 text-center text-sm font-semibold text-slate-500">
               
              </div>
              </div>

              {loginMutation.isError ? (
                <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                  Login gagal. Pastikan backend aktif dan akun benar.
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Email
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] px-4 transition focus-within:border-blue-500/60">
                    <Mail size={18} className="text-slate-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
                      placeholder="superadmin@dashai.test"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Password
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] px-4 transition focus-within:border-blue-500/60">
                    <LockKeyhole size={18} className="text-slate-600" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
                      placeholder="admin123"
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

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/10 bg-[#02040a]"
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
                  disabled={loginMutation.isPending}
                  className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  <ArrowRight
                    size={17}
                    className="transition group-hover:translate-x-0.5"
                  />
                </button>
                 Belum punya akun?{" "}
                <Link href="/register" className="font-black text-blue-400 hover:text-blue-300">
                  Daftar sekarang
                </Link>
              </div>
              
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