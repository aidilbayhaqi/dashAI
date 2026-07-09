"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/features/auth/api";

const publicRoutes = ["/login", "/register"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const { isLoading, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    enabled: !isPublicRoute,
    retry: false,
  });

  useEffect(() => {
    if (!isPublicRoute && isError) {
      router.push("/login");
    }
  }, [isPublicRoute, isError, router]);

  if (!isPublicRoute && isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02040a] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-5 text-sm font-bold">
          Checking secure session...
        </div>
      </main>
    );
  }

  return children;
}