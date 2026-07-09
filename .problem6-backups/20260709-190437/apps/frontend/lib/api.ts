import axios, {
  AxiosError,
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


const API_URL =
  process.env
    .NEXT_PUBLIC_API_URL
  || "http://localhost:8000";


export const api =
  axios.create({
    baseURL: API_URL,

    withCredentials: true,

    headers: {
      Accept:
        "application/json",

      "Content-Type":
        "application/json",
    },
  });


const refreshClient =
  axios.create({
    baseURL: API_URL,

    withCredentials: true,

    headers: {
      Accept:
        "application/json",

      "Content-Type":
        "application/json",
    },
  });


type RetryableRequestConfig =
  InternalAxiosRequestConfig & {
    _retry?: boolean;
  };


api.interceptors.request.use(
  (config) => {
    const accessToken =
      getAccessToken();

    if (accessToken) {
      config
        .headers
        .Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  }
);


let refreshPromise:
  | Promise<string>
  | null = null;


async function refreshAccessToken():
Promise<string> {
  if (!refreshPromise) {
    refreshPromise =
      refreshClient
        .post<TokenResponse>(
          "/api/v1/auth/refresh",
          {}
        )
        .then(
          (response) => {
            const accessToken =
              response
                .data
                .access_token;

            setAccessToken(
              accessToken
            );

            return accessToken;
          }
        )
        .finally(() => {
          refreshPromise = null;
        });
  }

  return refreshPromise;
}


function isAuthenticationEndpoint(
  requestUrl: string
) {
  return [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ].some(
    (endpoint) =>
      requestUrl.includes(
        endpoint
      )
  );
}


function redirectToLogin() {
  if (
    typeof window
    === "undefined"
  ) {
    return;
  }

  if (
    window.location.pathname
      === "/login"
    || window.location.pathname
      === "/register"
  ) {
    return;
  }

  window.location.replace(
    "/login"
  );
}


api.interceptors.response.use(
  (response) => response,

  async (
    error: AxiosError
  ) => {
    const originalRequest =
      error.config as
        | RetryableRequestConfig
        | undefined;

    const status =
      error.response?.status;

    const requestUrl =
      originalRequest?.url
      ?? "";

    if (
      status !== 401
      || !originalRequest
      || originalRequest._retry
      || isAuthenticationEndpoint(
        requestUrl
      )
    ) {
      return Promise.reject(
        error
      );
    }

    originalRequest._retry =
      true;

    try {
      const newAccessToken =
        await refreshAccessToken();

      originalRequest
        .headers
        .Authorization =
        `Bearer ${newAccessToken}`;

      return api(
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