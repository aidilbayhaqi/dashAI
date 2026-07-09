import { getAuthUser } from "@/lib/auth";


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
};


function extractRoleText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(extractRoleText)
      .join(" ");
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


function normalizeRole(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}


function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}


export function getCurrentUserScope(): AuthUserScope | null {
  return getAuthUser() as AuthUserScope | null;
}


export function getCurrentUserRole(): string {
  const user = getCurrentUserScope();

  const record = user as Record<string, unknown> | null;

  const roleText = [
    extractRoleText(user?.role),
    extractRoleText(user?.roles),
    extractRoleText(record?.role_name),
    extractRoleText(record?.role_slug),
  ].join(" ");

  return normalizeRole(roleText);
}


export function isCurrentUserSuperAdmin(): boolean {
  const user = getCurrentUserScope();

  if (!user) {
    return false;
  }

  if (user.is_superuser === true) {
    return true;
  }

  if (user.is_super_admin === true) {
    return true;
  }

  const role = getCurrentUserRole();

  return (
    role.includes("superadmin")
    || role.includes("super_admin")
    || role.includes("super_user")
    || role.includes("owner_platform")
    || role.includes("root")
  );
}


export function getCurrentCompanyId(): string | null {
  const user = getCurrentUserScope();

  const record = user as Record<string, unknown> | null;

  const candidates: unknown[] = [
    user?.company_id,
    user?.tenant_id,
    user?.company?.id,
    record?.companyId,
    record?.tenantId,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string"
      && isValidUuid(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}
