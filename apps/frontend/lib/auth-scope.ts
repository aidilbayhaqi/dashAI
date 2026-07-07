export type AuthUserScope = {
  id?: string;
  email?: string;
  name?: string;
  full_name?: string;
  role?: string | null;
  roles?: unknown;
  company_id?: string | null;
  tenant_id?: string | null;
  role_id?: string | null;
  permissions?: unknown;
  branch_ids?: unknown;
  is_superuser?: boolean;
  is_super_admin?: boolean;
  is_staff?: boolean;
  company?: {
    id?: string | null;
  } | null;
  user?: AuthUserScope;
  data?: AuthUserScope;
  profile?: AuthUserScope;
};

const USER_KEYS = [
  "dashai_auth_user",
  "dashai_user",
  "auth_user",
  "user",
  "current_user",
  "profile",
];

const TOKEN_KEYS = [
  "dashai_access_token",
  "access_token",
  "token",
  "auth_token",
];

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getBrowserStorageItems(key: string) {
  if (typeof window === "undefined") return [];

  return [sessionStorage.getItem(key), localStorage.getItem(key)].filter(
    (value): value is string => Boolean(value)
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) return null;

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");

    const decoded = atob(normalizedPayload);
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getStorageObject(): AuthUserScope | null {
  if (typeof window === "undefined") return null;

  for (const key of USER_KEYS) {
    for (const raw of getBrowserStorageItems(key)) {
      const parsed = safeJsonParse<AuthUserScope>(raw);

      if (parsed) return parsed;
    }
  }

  for (const key of TOKEN_KEYS) {
    for (const token of getBrowserStorageItems(key)) {
      const payload = decodeJwtPayload(token);

      if (payload) return payload as AuthUserScope;
    }
  }

  return null;
}

function unwrapUser(user: AuthUserScope | null): AuthUserScope | null {
  if (!user) return null;

  if (user.user) return unwrapUser(user.user);
  if (user.data) return unwrapUser(user.data);
  if (user.profile) return unwrapUser(user.profile);

  return user;
}

function extractRoleText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(extractRoleText).join(" ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      record.role,
      record.name,
      record.slug,
      record.code,
      record.type,
      record.value,
    ]
      .map(extractRoleText)
      .join(" ");
  }

  return String(value);
}

function normalizeRole(value: string) {
  return value.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function getCurrentUserScope(): AuthUserScope | null {
  return unwrapUser(getStorageObject());
}

export function getCurrentUserRole() {
  const user = getCurrentUserScope();

  const roleText = [
    extractRoleText(user?.role),
    extractRoleText(user?.roles),
    extractRoleText((user as Record<string, unknown> | null)?.["role_name"]),
    extractRoleText((user as Record<string, unknown> | null)?.["role_slug"]),
  ].join(" ");

  return normalizeRole(roleText);
}

export function isCurrentUserSuperAdmin() {
  const user = getCurrentUserScope();

  if (!user) return false;

  if (user.is_superuser === true) return true;
  if (user.is_super_admin === true) return true;

  const role = getCurrentUserRole();

  return (
    role.includes("superadmin") ||
    role.includes("super_admin") ||
    role.includes("super_user") ||
    role.includes("root") ||
    role.includes("owner_platform")
  );
}

export function getCurrentCompanyId() {
  const user = getCurrentUserScope();

  const candidates = [
    user?.company_id,
    user?.tenant_id,
    user?.company?.id,
    (user as Record<string, unknown> | null)?.["companyId"],
    (user as Record<string, unknown> | null)?.["tenantId"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && isValidUuid(candidate)) {
      return candidate;
    }
  }

  return null;
}