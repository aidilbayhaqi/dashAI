import { api } from "@/lib/api";
import type { ModuleMetric, ModuleRow } from "@/types/modules";
import type { CRMModuleKey } from "./types";

type GetCRMModuleDataParams = {
  moduleKey: CRMModuleKey;
  companyId?: string;
};

type ApiListResponse = {
  data?: ModuleRow[];
  items?: ModuleRow[];
  results?: ModuleRow[];
  rows?: ModuleRow[];
};

const endpointMap: Record<CRMModuleKey, string> = {
  leads: "/api/v1/crm/leads",
  contacts: "/api/v1/crm/contacts",
  deals: "/api/v1/crm/deals",
  activities: "/api/v1/crm/activities",
};

const sortMap: Record<CRMModuleKey, string> = {
  leads: "created_at",
  contacts: "created_at",
  deals: "created_at",
  activities: "created_at",
};

function normalizeRows(data: unknown): ModuleRow[] {
  if (Array.isArray(data)) return data as ModuleRow[];

  if (!data || typeof data !== "object") return [];

  const record = data as ApiListResponse;

  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.rows)) return record.rows;

  return [];
}

function pick(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function parseMoneyNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value)
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "")
    .trim();

  if (!raw) return null;

  const cleaned = raw.replace(/[^\d.,-]/g, "");

  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastCommaIndex = cleaned.lastIndexOf(",");
    const lastDotIndex = cleaned.lastIndexOf(".");

    if (lastCommaIndex > lastDotIndex) {
      normalized = cleaned.replaceAll(".", "").replace(",", ".");
    } else {
      normalized = cleaned.replaceAll(",", "");
    }
  } else if (hasDot) {
    const parts = cleaned.split(".");

    if (parts.length === 2 && parts[1].length <= 6) {
      normalized = cleaned;
    } else {
      normalized = cleaned.replaceAll(".", "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");

    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = cleaned.replace(",", ".");
    } else {
      normalized = cleaned.replaceAll(",", "");
    }
  }

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function formatRupiah(value: unknown) {
  const parsed = parseMoneyNumber(value);

  if (parsed === null) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function normalizeLeadRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const rawEstimatedValue = pick(row, [
      "estimated_value",
      "value",
      "amount",
    ]);

    return {
      ...row,

      name: pick(row, ["name", "lead_name", "full_name"]),
      company_name: pick(row, ["company_name", "customer_company_name"]),
      email: pick(row, ["email"]),
      phone: pick(row, ["phone"]),
      source: pick(row, ["source"]),

      estimated_value_raw: rawEstimatedValue,
      estimated_value: formatRupiah(rawEstimatedValue),

      status: pick(row, ["status"]),
    };
  });
}

function normalizeContactRows(rows: ModuleRow[]) {
  return rows.map((row) => ({
    ...row,
    name: pick(row, ["name", "contact_name", "full_name"]),
    company_name: pick(row, ["company_name", "customer_company_name"]),
    position: pick(row, ["position", "job_title"]),
    email: pick(row, ["email"]),
    phone: pick(row, ["phone"]),
    lead_name: pick(row, ["lead_name", "lead"]),
  }));
}

function normalizeDealRows(rows: ModuleRow[]) {
  return rows.map((row) => {
    const rawExpectedValue = pick(row, [
      "expected_value",
      "amount",
      "value",
    ]);

    return {
      ...row,

      title: pick(row, ["title", "deal_title", "name"]),
      lead_name: pick(row, ["lead_name", "lead"]),
      contact_name: pick(row, ["contact_name", "contact"]),

      expected_value_raw: rawExpectedValue,
      expected_value: formatRupiah(rawExpectedValue),

      probability_percent: pick(row, [
        "probability_percent",
        "probability",
      ]),
      expected_close_date: pick(row, [
        "expected_close_date",
        "close_date",
      ]),
      stage: pick(row, ["stage", "status"]),
    };
  });
}

function normalizeActivityRows(rows: ModuleRow[]) {
  return rows.map((row) => ({
    ...row,
    activity_type: pick(row, ["activity_type", "type"]),
    subject: pick(row, ["subject", "title", "name"]),
    lead_name: pick(row, ["lead_name", "lead"]),
    contact_name: pick(row, ["contact_name", "contact"]),
    deal_title: pick(row, ["deal_title", "deal_name", "deal"]),
    activity_date: pick(row, ["activity_date", "scheduled_at", "created_at"]),
    status: pick(row, ["status"]),
  }));
}

function normalizeByModule(moduleKey: CRMModuleKey, rows: ModuleRow[]) {
  if (moduleKey === "leads") return normalizeLeadRows(rows);
  if (moduleKey === "contacts") return normalizeContactRows(rows);
  if (moduleKey === "deals") return normalizeDealRows(rows);
  if (moduleKey === "activities") return normalizeActivityRows(rows);

  return rows;
}

function buildMetrics(
  moduleKey: CRMModuleKey,
  rows: ModuleRow[]
): ModuleMetric[] {
  const total = rows.length;

  const won = rows.filter((row) =>
    ["won", "converted", "done"].includes(
      String(row.status ?? row.stage ?? "").toLowerCase()
    )
  ).length;

  const needFollowUp = rows.filter((row) =>
    [
      "new",
      "contacted",
      "qualified",
      "prospecting",
      "proposal",
      "negotiation",
      "planned",
    ].some((status) =>
      String(row.status ?? row.stage ?? "").toLowerCase().includes(status)
    )
  ).length;

  return [
    {
      label: "Total Records",
      value: String(total),
      helper: `Total data CRM ${moduleKey}.`,
    },
    {
      label: "Won / Converted",
      value: String(won),
      helper: "Deal won, lead converted, atau activity done.",
    },
    {
      label: "Need Follow Up",
      value: String(needFollowUp),
      helper: "Lead/deal/activity yang masih perlu ditindaklanjuti.",
    },
  ];
}

export async function getCRMModuleData({
  moduleKey,
  companyId,
}: GetCRMModuleDataParams) {
  const endpoint = endpointMap[moduleKey];

  const response = await api.get(endpoint, {
    params: {
      ...(companyId ? { company_id: companyId } : {}),
      limit: 100,
      sort_by: sortMap[moduleKey],
      sort_order: "asc",
    },
  });

  const rows = normalizeByModule(moduleKey, normalizeRows(response.data));

  return {
    rows,
    metrics: buildMetrics(moduleKey, rows),
    aiNotes: [
      `Data CRM ${moduleKey} sudah fetch dari ${endpoint}.`,
      companyId
        ? "Data CRM sedang difilter berdasarkan company."
        : "Superadmin bisa melihat semua company atau memilih company dari filter.",
    ],
  };
}