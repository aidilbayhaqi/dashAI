import type {
  AuthUser,
  TokenResponse,
} from "@/types/backend";


let memoryAccessToken:
  | string
  | null = null;

let memoryAuthUser:
  | AuthUser
  | null = null;


export function setAuthSession(
  token: TokenResponse,
  user?: AuthUser
) {
  memoryAccessToken =
    token.access_token;

  if (user) {
    memoryAuthUser = user;
  }
}


export function setAccessToken(
  accessToken: string
) {
  memoryAccessToken =
    accessToken;
}


export function getAccessToken() {
  return memoryAccessToken;
}


export function setAuthUser(
  user: AuthUser | null
) {
  memoryAuthUser = user;
}


export function getAuthUser():
AuthUser | null {
  return memoryAuthUser;
}


export function getCurrentCompanyId() {
  return (
    memoryAuthUser
      ?.company_id
    ?? null
  );
}


export function clearAuthSession() {
  memoryAccessToken = null;
  memoryAuthUser = null;
}


/**
 * Alias sementara agar komponen lama
 * yang masih memakai clearTokens
 * tidak mengalami error.
 */
export function clearTokens() {
  clearAuthSession();
}