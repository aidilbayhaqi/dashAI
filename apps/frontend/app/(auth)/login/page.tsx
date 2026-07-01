"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { login } from "@/features/auth/api";
import { saveTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("superadmin@dashai.test");
  const [password, setPassword] = useState("admin123");

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      saveTokens(data.access_token, data.refresh_token);
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-black"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Login DashAI
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Masuk ke dashboard ERP + AI Agent.
          </p>
        </div>

        {loginMutation.isError ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Login gagal. Pastikan backend aktif dan akun benar.
          </div>
        ) : null}

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@dashai.test"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginMutation.isPending ? "Masuk..." : "Login"}
          </button>
        </div>
      </form>
    </main>
  );
}