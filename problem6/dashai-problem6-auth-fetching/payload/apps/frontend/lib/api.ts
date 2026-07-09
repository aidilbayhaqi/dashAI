import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  clearAuthSession,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth";

import type {
  TokenResponse,
} from "@/types/backend";


const API_BASE_URL =
  process.env
    .NEXT_PUBLIC_API_URL
  || "http://localhost:8000";


type RetryableRequestConfig =
  InternalAxiosRequestConfig & {
    _retry?: boolean;
  };


export const api =
  axios.create({
    baseURL:
      API_BASE_URL,

    withCredentials:
      true,
  });


const refreshClient =
  axios.create({
    baseURL:
      API_BASE_URL,

    withCredentials:
      true,
  });


let refreshPromise:
  | Promise<string>
  | null = null;


function isPublicAuthRequest(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  return [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/register/companies",
  ].some(
    (endpoint) =>
      url.includes(
        endpoint
      )
  );
}


function redirectToLogin():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  if (
    window.location.pathname
      .startsWith("/login")
  ) {
    return;
  }

  const returnTo =
    `${window.location.pathname}` +
    `${window.location.search}`;

  window.location.assign(
    `/login?returnTo=${
      encodeURIComponent(
        returnTo
      )
    }`
  );
}


async function requestNewAccessToken():
  Promise<string> {
  const response =
    await refreshClient.post<
      TokenResponse
    >(
      "/api/v1/auth/refresh",
      {}
    );

  const accessToken =
    response.data
      .access_token;

  if (!accessToken) {
    throw new Error(
      "Refresh response tidak " +
      "memiliki access token."
    );
  }

  setAccessToken(
    accessToken
  );

  return accessToken;
}


export async function
refreshAccessToken():
  Promise<string> {
  if (!refreshPromise) {
    refreshPromise =
      requestNewAccessToken()
        .finally(() => {
          refreshPromise = null;
        });
  }

  return refreshPromise;
}


export async function
bootstrapAccessToken():
  Promise<string> {
  const currentToken =
    getAccessToken();

  if (currentToken) {
    return currentToken;
  }

  return refreshAccessToken();
}


api.interceptors
  .request.use(
    (
      config:
        InternalAxiosRequestConfig
    ) => {
      const accessToken =
        getAccessToken();

      config.headers =
        AxiosHeaders.from(
          config.headers
        );

      config.headers.set(
        "Accept",
        "application/json"
      );

      if (accessToken) {
        config.headers.set(
          "Authorization",
          `Bearer ${accessToken}`
        );
      }

      return config;
    }
  );


api.interceptors
  .response.use(
    (response) =>
      response,

    async (
      error: AxiosError
    ) => {
      const status =
        error.response
          ?.status;

      const originalRequest =
        error.config as
          | RetryableRequestConfig
          | undefined;

      if (
        status !== 401
        || !originalRequest
        || originalRequest
          ._retry
        || isPublicAuthRequest(
          originalRequest.url
        )
      ) {
        return Promise.reject(
          error
        );
      }

      originalRequest._retry =
        true;

      try {
        const accessToken =
          await refreshAccessToken();

        originalRequest.headers =
          AxiosHeaders.from(
            originalRequest
              .headers
          );

        originalRequest
          .headers
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          );

        return api.request(
          originalRequest
        );
      } catch (
        refreshError
      ) {
        clearAuthSession();

        redirectToLogin();

        return Promise.reject(
          refreshError
        );
      }
    }
  );
