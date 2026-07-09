import {
  getAuthUser,
} from "@/lib/auth";

import type {
  AuthUser,
} from "@/types/backend";


export type AuthUserScope =
  AuthUser;


export function getCurrentUserScope():
AuthUserScope | null {
  return getAuthUser();
}


export function getCurrentUserRole() {
  const user =
    getAuthUser();

  if (!user) {
    return "";
  }

  if (user.is_superuser) {
    return "superadmin";
  }

  return (
    user.role_id
    ?? "company_user"
  );
}


export function isCurrentUserSuperAdmin() {
  return (
    getAuthUser()
      ?.is_superuser
    === true
  );
}


export function getCurrentCompanyId() {
  return (
    getAuthUser()
      ?.company_id
    ?? null
  );
}