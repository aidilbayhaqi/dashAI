"use client";

import {
  type ReactNode,
  useState,
} from "react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  ReactQueryDevtools,
} from "@tanstack/react-query-devtools";


function getHttpStatus(
  error: unknown
):
  | number
  | undefined {
  const candidate =
    error as {
      response?: {
        status?: number;
      };
    };

  return candidate
    .response
    ?.status;
}


function shouldRetryQuery(
  failureCount: number,
  error: unknown
): boolean {
  const status =
    getHttpStatus(
      error
    );

  if (
    status
    && [
      400,
      401,
      403,
      404,
      409,
      422,
    ].includes(status)
  ) {
    return false;
  }

  return (
    failureCount < 2
  );
}


export function QueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [queryClient] =
    useState(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: {
              staleTime:
                30_000,

              gcTime:
                5 * 60_000,

              retry:
                shouldRetryQuery,

              refetchOnWindowFocus:
                false,

              refetchOnReconnect:
                true,
            },

            mutations: {
              retry:
                false,
            },
          },
        })
    );

  return (
    <QueryClientProvider
      client={queryClient}
    >
      {children}

      {process.env.NODE_ENV
        === "development"
        ? (
          <ReactQueryDevtools
            initialIsOpen={
              false
            }
          />
        )
        : null}
    </QueryClientProvider>
  );
}
