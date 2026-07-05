export type CRMModuleKey = "leads" | "contacts" | "deals" | "activities";

export function normalizeCRMModuleKey(value: string): CRMModuleKey {
  const normalized = value.trim();

  const aliases: Record<string, CRMModuleKey> = {
    leads: "leads",
    lead: "leads",

    contacts: "contacts",
    contact: "contacts",

    deals: "deals",
    deal: "deals",

    activities: "activities",
    activity: "activities",
  };

  return aliases[normalized] ?? "leads";
}