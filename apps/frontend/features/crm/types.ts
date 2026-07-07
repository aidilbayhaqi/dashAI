export type CRMModuleKey =
  | "leads"
  | "contacts"
  | "deals"
  | "activities"
  | "campaigns";

export function normalizeCRMModuleKey(value: string): CRMModuleKey {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  const aliases: Record<string, CRMModuleKey> = {
    overview: "leads",

    lead: "leads",
    leads: "leads",

    contact: "contacts",
    contacts: "contacts",
    customer: "contacts",
    customers: "contacts",

    deal: "deals",
    deals: "deals",

    // Pipeline mengambil data Deals.
    pipeline: "deals",
    pipelines: "deals",

    activity: "activities",
    activities: "activities",

    campaign: "campaigns",
    campaigns: "campaigns",
  };

  return aliases[normalized] ?? "leads";
}