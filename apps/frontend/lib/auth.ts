import type { AuthUser, TokenResponse } from "@/types/backend";

const ACCESS_TOKEN_KEY = "dashai_access_token";
const REFRESH_TOKEN_KEY = "dashai_refresh_token";
const AUTH_USER_KEY = "dashai_auth_user";

let memoryAccessToken: string | null = null;

export function setAuthSession(token: TokenResponse, user?: AuthUser) {
  memoryAccessToken = token.access_token;

  sessionStorage.setItem(ACCESS_TOKEN_KEY, token.access_token);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);

  if (user) {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
}

export function setAccessToken(accessToken: string) {
  memoryAccessToken = accessToken;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function getAccessToken() {
  if (memoryAccessToken) return memoryAccessToken;

  if (typeof window === "undefined") return null;

  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  memoryAccessToken = token;

  return token;
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getCurrentCompanyId() {
  return getAuthUser()?.company_id ?? null;
}

export function clearAuthSession() {
  memoryAccessToken = null;

  if (typeof window === "undefined") return;

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Alias lama supaya Topbar yang masih import clearTokens tidak error.
 */
export function clearTokens() {
  clearAuthSession();
}