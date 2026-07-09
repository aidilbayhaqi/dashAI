import type {
  AuthUser,
  TokenResponse,
} from "@/types/backend";


const AUTH_USER_KEY =
  "dashai_auth_user";

const AUTH_CHANGED_EVENT =
  "dashai:auth-changed";

const LEGACY_STORAGE_KEYS = [
  "dashai_access_token",
  "dashai_refresh_token",
  "access_token",
  "refresh_token",
  "token",
  "auth_token",
];


let memoryAccessToken:
  | string
  | null = null;


function isBrowser(): boolean {
  return (
    typeof window !==
    "undefined"
  );
}


function emitAuthChanged(): void {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      AUTH_CHANGED_EVENT
    )
  );
}


function cleanupLegacyTokens(): void {
  if (!isBrowser()) {
    return;
  }

  for (
    const key
    of LEGACY_STORAGE_KEYS
  ) {
    sessionStorage.removeItem(
      key
    );

    localStorage.removeItem(
      key
    );
  }
}


export function setAccessToken(
  accessToken:
    | string
    | null
): void {
  memoryAccessToken =
    accessToken;
}


export function getAccessToken():
  | string
  | null {
  return memoryAccessToken;
}


export function setAuthUser(
  user: AuthUser | null,
  broadcast = true
): void {
  if (!isBrowser()) {
    return;
  }

  if (user) {
    sessionStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify(user)
    );
  } else {
    sessionStorage.removeItem(
      AUTH_USER_KEY
    );
  }

  if (broadcast) {
    emitAuthChanged();
  }
}


export function setAuthSession(
  token: TokenResponse,
  user?: AuthUser
): void {
  setAccessToken(
    token.access_token
  );

  cleanupLegacyTokens();

  if (user) {
    setAuthUser(
      user,
      false
    );
  }

  emitAuthChanged();
}


export function getAuthUser():
  | AuthUser
  | null {
  if (!isBrowser()) {
    return null;
  }

  const raw =
    sessionStorage.getItem(
      AUTH_USER_KEY
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      raw
    ) as AuthUser;
  } catch {
    sessionStorage.removeItem(
      AUTH_USER_KEY
    );

    return null;
  }
}


export function getCurrentCompanyId():
  | string
  | null {
  return (
    getAuthUser()?.company_id
    ?? null
  );
}


export function clearAuthSession(
  broadcast = true
): void {
  memoryAccessToken = null;

  if (isBrowser()) {
    sessionStorage.removeItem(
      AUTH_USER_KEY
    );

    cleanupLegacyTokens();
  }

  if (broadcast) {
    emitAuthChanged();
  }
}


export function subscribeAuthChanges(
  listener: () => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  window.addEventListener(
    AUTH_CHANGED_EVENT,
    listener
  );

  return () => {
    window.removeEventListener(
      AUTH_CHANGED_EVENT,
      listener
    );
  };
}


/**
 * Alias kompatibilitas untuk
 * komponen lama.
 */
export function clearTokens():
  void {
  clearAuthSession();
}
