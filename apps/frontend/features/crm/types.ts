import { normalizeModuleKey } from "@/lib/module-registry";

export type CRMModuleKey =
  | "leads"
  | "contacts"
  | "deals"
  | "activities"
  | "campaigns";

export function normalizeCRMModuleKey(value: string): CRMModuleKey {
  return normalizeModuleKey("crm", value) as CRMModuleKey;
}