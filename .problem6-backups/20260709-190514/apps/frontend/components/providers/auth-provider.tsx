"use client";

import {
  type ReactNode,
  useEffect,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getMe,
} from "@/features/auth/api";

import {
  bootstrapAccessToken,
} from "@/lib/api";

import {
  clearAuthSession,
  getAuthUser,
  setAuthUser,
  subscribeAuthChanges,
} from "@/lib/auth";


const PUBLIC_ROUTES = [
  "/login",
  "/register",
];


function isPublicPath(
  pathname: string
): boolean {
  return PUBLIC_ROUTES
    .some(
      (route) =>
        pathname
          .startsWith(route)
    );
}


export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const queryClient =
    useQueryClient();

  const isPublicRoute =
    isPublicPath(
      pathname
    );

  useEffect(() => {
    return subscribeAuthChanges(
      () => {
        const user =
          getAuthUser();

        if (user) {
          queryClient
            .setQueryData(
              ["auth", "me"],
              user
            );
        } else {
          queryClient
            .removeQueries({
              queryKey:
                ["auth"],
            });
        }
      }
    );
  }, [
    queryClient,
  ]);

  const sessionQuery =
    useQuery({
      queryKey:
        ["auth", "me"],

      queryFn:
        async () => {
          await (
            bootstrapAccessToken()
          );

          const user =
            await getMe();

          setAuthUser(
            user,
            false
          );

          return user;
        },

      enabled:
        !isPublicRoute,

      retry:
        false,

      staleTime:
        60_000,

      gcTime:
        10 * 60_000,

      refetchOnWindowFocus:
        false,
    });

  useEffect(() => {
    if (
      isPublicRoute
      || !sessionQuery
        .isError
    ) {
      return;
    }

    clearAuthSession(
      false
    );

    const returnTo =
      `${pathname}`;

    router.replace(
      `/login?returnTo=${
        encodeURIComponent(
          returnTo
        )
      }`
    );
  }, [
    isPublicRoute,
    pathname,
    router,
    sessionQuery
      .isError,
  ]);

  if (isPublicRoute) {
    return children;
  }

  if (
    sessionQuery.isPending
    || sessionQuery
      .isFetching
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02040a] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-5 text-sm font-bold">
          Checking secure session...
        </div>
      </main>
    );
  }

  if (
    sessionQuery.isError
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02040a] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-5 text-sm font-bold">
          Redirecting to login...
        </div>
      </main>
    );
  }

  return children;
}
