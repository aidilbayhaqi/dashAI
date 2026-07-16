import { api } from "@/lib/api";
import { isEndpointFallbackError } from "@/lib/api-error";

import type {
  ModuleData,
  ModuleMetric,
  ModuleRow,
} from "@/types/modules";

import type { CRMModuleKey } from "./types";

type GetCRMModuleDataParams = {
  moduleKey: CRMModuleKey;
  companyId?: string;
};

type RawRecord = Record<string, unknown>;
type RowIndex = Record<string, ModuleRow>;

const endpointMap: Record<CRMModuleKey, string> = {
  leads: "/api/v1/crm/leads",
  contacts: "/api/v1/crm/contacts",
  deals: "/api/v1/crm/deals",
  activities: "/api/v1/crm/activities",
  campaigns: "/api/v1/crm/campaigns",
};

const sortMap: Record<CRMModuleKey, string> = {
  leads: "updated_at",
  contacts: "updated_at",
  deals: "updated_at",
  activities: "updated_at",
  campaigns: "updated_at",
};

function hasValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
}

function pickRaw(
  record: RawRecord,
  keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];

    if (hasValue(value)) {
      return String(value);
    }
  }

  return "";
}

function pick(
  row: ModuleRow,
  keys: string[]
): string {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) {
      return String(value);
    }
  }

  return "";
}

function toModuleRow(value: unknown): ModuleRow {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as RawRecord;
  const result: ModuleRow = {};

  Object.entries(source).forEach(([key, currentValue]) => {
    if (currentValue === undefined || currentValue === null) {
      result[key] = "";
      return;
    }

    if (Array.isArray(currentValue)) {
      result[key] = currentValue.map(String).join(", ");
      return;
    }

    if (typeof currentValue === "object") {
      const nested = currentValue as RawRecord;

      const nestedDisplay = pickRaw(nested, [
        "full_name",
        "name",
        "title",
        "deal_title",
        "deal_name",
        "lead_name",
        "contact_name",
        "company_name",
        "email",
        "code",
        "label",
      ]);

      result[key] =
        nestedDisplay || JSON.stringify(currentValue);

      return;
    }

    result[key] = String(currentValue);
  });

  return result;
}

function normalizeRows(data: unknown): ModuleRow[] {
  if (Array.isArray(data)) {
    return data.map(toModuleRow);
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as RawRecord;

  const arrayKeys = [
    "data",
    "items",
    "results",
    "rows",
    "records",

    "leads",
    "contacts",
    "deals",
    "activities",
    "campaigns",
  ];

  for (const key of arrayKeys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.map(toModuleRow);
    }

    if (value && typeof value === "object") {
      const nestedRows = normalizeRows(value);

      if (nestedRows.length > 0) {
        return nestedRows;
      }
    }
  }

  const firstArray = Object.values(record).find(
    (value) => Array.isArray(value)
  );

  if (Array.isArray(firstArray)) {
    return firstArray.map(toModuleRow);
  }

  return [];
}

function buildIndex(
  rows: ModuleRow[],
  idKeys: string[] = ["id"]
): RowIndex {
  const index: RowIndex = {};

  rows.forEach((row) => {
    for (const idKey of idKeys) {
      const id = pick(row, [idKey]);

      if (id) {
        index[id] = row;
      }
    }
  });

  return index;
}

function getLeadName(
  row: ModuleRow,
  leadIndex: RowIndex
): string {
  const directName = pick(row, [
    "lead_name",
    "lead_full_name",
    "lead_title",
    "lead",
  ]);

  if (directName) {
    return directName;
  }

  const leadId = pick(row, [
    "lead_id",
    "crm_lead_id",
  ]);

  if (!leadId) {
    return "-";
  }

  const lead = leadIndex[leadId];

  if (!lead) {
    return leadId;
  }

  return (
    pick(lead, [
      "name",
      "full_name",
      "lead_name",
      "company_name",
      "email",
    ]) || leadId
  );
}

function getContactName(
  row: ModuleRow,
  contactIndex: RowIndex
): string {
  const directName = pick(row, [
    "contact_name",
    "contact_full_name",
    "contact",
  ]);

  if (directName) {
    return directName;
  }

  const contactId = pick(row, [
    "contact_id",
    "crm_contact_id",
  ]);

  if (!contactId) {
    return "-";
  }

  const contact = contactIndex[contactId];

  if (!contact) {
    return contactId;
  }

  return (
    pick(contact, [
      "name",
      "full_name",
      "contact_name",
      "email",
      "phone",
    ]) || contactId
  );
}

function getDealTitle(
  row: ModuleRow,
  dealIndex: RowIndex
): string {
  const directTitle = pick(row, [
    "deal_title",
    "deal_name",
    "deal",
  ]);

  if (directTitle) {
    return directTitle;
  }

  const dealId = pick(row, [
    "deal_id",
    "crm_deal_id",
  ]);

  if (!dealId) {
    return "-";
  }

  const deal = dealIndex[dealId];

  if (!deal) {
    return dealId;
  }

  return (
    pick(deal, [
      "title",
      "name",
      "deal_title",
      "deal_name",
    ]) || dealId
  );
}

function parseMoney(value: unknown): number | null {
  if (!hasValue(value)) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value)
    .replace(/Rp/gi, "")
    .replace(/IDR/gi, "")
    .replace(/\s/g, "")
    .trim();

  if (!raw) {
    return null;
  }

  const cleaned = raw.replace(/[^\d.,-]/g, "");

  if (!cleaned) {
    return null;
  }

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastCommaIndex = cleaned.lastIndexOf(",");
    const lastDotIndex = cleaned.lastIndexOf(".");

    normalized =
      lastCommaIndex > lastDotIndex
        ? cleaned
            .replace(/\./g, "")
            .replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    const parts = cleaned.split(",");

    normalized =
      parts.length === 2 &&
      parts[1].length <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    const parts = cleaned.split(".");

    normalized =
      parts.length === 2 &&
      parts[1].length <= 2
        ? cleaned
        : cleaned.replace(/\./g, "");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseProbability(
  value: unknown
): number | null {
  if (!hasValue(value)) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .replace("%", "")
    .replace(",", ".")
    .trim();

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function formatRupiah(value: unknown): string {
  const amount = parseMoney(value);

  if (amount === null) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatProbability(
  value: unknown
): string {
  const probability = parseProbability(value);

  if (probability === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(probability)}%`;
}

function formatDate(value: unknown): string {
  if (!hasValue(value)) {
    return "-";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: unknown): string {
  if (!hasValue(value)) {
    return "-";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusText(value: unknown): string {
  if (!hasValue(value)) {
    return "-";
  }

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function normalizeLeadRows(
  rows: ModuleRow[]
): ModuleRow[] {
  return rows.map((row) => {
    const estimatedValue = pick(row, [
      "estimated_value",
      "estimatedValue",
      "estimated_amount",
      "amount",
      "value",
    ]);

    const source = pick(row, [
      "source",
      "lead_source",
    ]);

    const status = pick(row, ["status"]);

    return {
      ...row,

      name:
        pick(row, [
          "name",
          "lead_name",
          "full_name",
          "contact_name",
        ]) || "-",

      company_name:
        pick(row, [
          "company_name",
          "organization_name",
          "customer_company_name",
        ]) || "-",

      email: pick(row, ["email"]) || "-",
      phone: pick(row, ["phone"]) || "-",

      source,
      source_label: statusText(source),

      status,
      status_label: statusText(status),

      estimated_value: estimatedValue,
      estimated_value_raw: estimatedValue,

      estimated_value_display:
        formatRupiah(estimatedValue),
    };
  });
}

function normalizeContactRows(
  rows: ModuleRow[],
  leadIndex: RowIndex
): ModuleRow[] {
  return rows.map((row) => ({
    ...row,

    name:
      pick(row, [
        "name",
        "contact_name",
        "full_name",
      ]) || "-",

    company_name:
      pick(row, [
        "company_name",
        "organization_name",
        "customer_company_name",
      ]) || "-",

    position:
      pick(row, [
        "position",
        "job_title",
        "role",
      ]) || "-",

    email: pick(row, ["email"]) || "-",
    phone: pick(row, ["phone"]) || "-",

    lead_name: getLeadName(
      row,
      leadIndex
    ),
  }));
}

function normalizeDealRows(
  rows: ModuleRow[],
  leadIndex: RowIndex,
  contactIndex: RowIndex
): ModuleRow[] {
  return rows.map((row) => {
    const expectedValue = pick(row, [
      "expected_value",
      "expectedValue",
      "deal_value",
      "total_value",
      "estimated_value",
      "amount",
      "value",
    ]);

    const probability = pick(row, [
      "probability_percent",
      "probabilityPercent",
      "probability",
      "win_probability",
      "probability_rate",
      "chance",
    ]);

    const expectedCloseDate = pick(row, [
      "expected_close_date",
      "expectedCloseDate",
      "close_date",
      "target_close_date",
    ]);

    const stage = pick(row, [
      "stage",
      "pipeline_stage",
      "deal_stage",
      "status",
    ]);

    const title =
      pick(row, [
        "title",
        "deal_title",
        "deal_name",
        "name",
      ]) || "-";

    const leadName = getLeadName(
      row,
      leadIndex
    );

    const contactName = getContactName(
      row,
      contactIndex
    );

    const expectedValueDisplay =
      formatRupiah(expectedValue);

    const probabilityDisplay =
      formatProbability(probability);

    return {
      ...row,

      title,
      name: title,
      deal_title: title,
      deal_name: title,

      lead_name: leadName,
      contact_name: contactName,

      expected_value: expectedValue,
      expected_value_raw: expectedValue,
      expectedValue,

      expected_value_display:
        expectedValueDisplay,

      expectedValueDisplay,

      deal_value_display:
        expectedValueDisplay,

      amount_display:
        expectedValueDisplay,

      value_display:
        expectedValueDisplay,

      probability_percent: probability,
      probability_percent_raw: probability,
      probabilityPercent: probability,

      probability_display:
        probabilityDisplay,

      probabilityDisplay,

      probability_percent_display:
        probabilityDisplay,

      expected_close_date: expectedCloseDate,

      expected_close_date_display:
        formatDate(expectedCloseDate),

      stage,
      pipeline_stage: stage,
      deal_stage: stage,

      stage_label: statusText(stage),
      status_label: statusText(stage),
    };
  });
}

function normalizeActivityRows(
  rows: ModuleRow[],
  leadIndex: RowIndex,
  contactIndex: RowIndex,
  dealIndex: RowIndex
): ModuleRow[] {
  return rows.map((row) => {
    const activityType = pick(row, [
      "activity_type",
      "type",
    ]);

    const dueAt = pick(row, [
      "due_at",
      "activity_date",
      "scheduled_at",
      "created_at",
    ]);

    const status = pick(row, ["status"]);

    return {
      ...row,

      activity_type: activityType,
      activity_type_label:
        statusText(activityType),

      subject:
        pick(row, [
          "subject",
          "title",
          "name",
        ]) || "-",

      lead_name: getLeadName(
        row,
        leadIndex
      ),

      contact_name: getContactName(
        row,
        contactIndex
      ),

      deal_title: getDealTitle(
        row,
        dealIndex
      ),

      due_at: dueAt,
      activity_date: dueAt,

      activity_date_display:
        formatDateTime(dueAt),

      status,
      status_label: statusText(status),
    };
  });
}

function normalizeCampaignRows(
  rows: ModuleRow[]
): ModuleRow[] {
  return rows.map((row) => {
    const budgetAmount = pick(row, [
      "budget_amount",
      "budget",
      "amount",
    ]);

    const leadsCount = pick(row, [
      "leads_count",
      "lead_count",
      "leads",
    ]);

    const startDate = pick(row, [
      "start_date",
    ]);

    const endDate = pick(row, [
      "end_date",
    ]);

    const status = pick(row, ["status"]);
    const channel = pick(row, ["channel"]);

    return {
      ...row,

      name:
        pick(row, [
          "name",
          "campaign_name",
          "title",
        ]) || "-",

      channel,
      channel_label: statusText(channel),

      budget_amount: budgetAmount,
      budget_amount_raw: budgetAmount,

      budget_amount_display:
        formatRupiah(budgetAmount),

      leads_count: leadsCount || "0",

      start_date: startDate,
      end_date: endDate,

      start_date_display:
        formatDate(startDate),

      end_date_display:
        formatDate(endDate),

      status,
      status_label: statusText(status),
    };
  });
}

function normalizeByModule(
  moduleKey: CRMModuleKey,
  rows: ModuleRow[],
  leadIndex: RowIndex,
  contactIndex: RowIndex,
  dealIndex: RowIndex
): ModuleRow[] {
  switch (moduleKey) {
    case "leads":
      return normalizeLeadRows(rows);

    case "contacts":
      return normalizeContactRows(
        rows,
        leadIndex
      );

    case "deals":
      return normalizeDealRows(
        rows,
        leadIndex,
        contactIndex
      );

    case "activities":
      return normalizeActivityRows(
        rows,
        leadIndex,
        contactIndex,
        dealIndex
      );

    case "campaigns":
      return normalizeCampaignRows(rows);

    default:
      return rows;
  }
}

function buildMetrics(
  moduleKey: CRMModuleKey,
  rows: ModuleRow[]
): ModuleMetric[] {
  const total = rows.length;

  const completed = rows.filter((row) => {
    const status = String(
      row.status ?? row.stage ?? ""
    ).toLowerCase();

    return [
      "won",
      "converted",
      "done",
      "completed",
    ].includes(status);
  }).length;

  const needFollowUp = rows.filter((row) => {
    const status = String(
      row.status ?? row.stage ?? ""
    ).toLowerCase();

    return [
      "new",
      "contacted",
      "qualified",
      "prospecting",
      "qualification",
      "proposal",
      "negotiation",
      "planned",
      "draft",
      "active",
    ].some((item) =>
      status.includes(item)
    );
  }).length;

  if (moduleKey === "deals") {
    const totalPipelineValue = rows.reduce(
      (totalValue, row) =>
        totalValue +
        (parseMoney(
          row.expected_value
        ) ?? 0),
      0
    );

    return [
      {
        label: "Total Deals",
        value: String(total),
        helper: "Jumlah deal dalam pipeline.",
      },
      {
        label: "Pipeline Value",
        value: formatRupiah(
          totalPipelineValue
        ),
        helper:
          "Total expected value seluruh deal.",
      },
      {
        label: "Need Follow Up",
        value: String(needFollowUp),
        helper:
          "Deal yang masih berada dalam proses.",
      },
    ];
  }

  return [
    {
      label: "Total Records",
      value: String(total),
      helper: `Total data CRM ${moduleKey}.`,
    },
    {
      label: "Won / Completed",
      value: String(completed),
      helper:
        "Data yang sudah selesai atau converted.",
    },
    {
      label: "Need Follow Up",
      value: String(needFollowUp),
      helper:
        "Data yang masih membutuhkan follow up.",
    },
  ];
}

async function fetchCRMRows(
  endpoint: string,
  params: Record<string, unknown>
): Promise<ModuleRow[]> {
  try {
    const response = await api.get(endpoint, {
      params,
    });

    return normalizeRows(response.data);
  } catch (error) {
    if (!isEndpointFallbackError(error)) {
      throw error;
    }

    return [];
  }
}

export async function getCRMModuleData({
  moduleKey,
  companyId,
}: GetCRMModuleDataParams): Promise<ModuleData> {
  const baseParams: Record<string, unknown> = {
    ...(companyId
      ? { company_id: companyId }
      : {}),

    limit: 100,
    sort_order: "desc",
  };

  const [
    currentRows,
    leadRows,
    contactRows,
    dealRows,
  ] = await Promise.all([
    fetchCRMRows(
      endpointMap[moduleKey],
      {
        ...baseParams,
        sort_by: sortMap[moduleKey],
      }
    ),

    fetchCRMRows(
      endpointMap.leads,
      {
        ...baseParams,
        sort_by: "created_at",
      }
    ),

    fetchCRMRows(
      endpointMap.contacts,
      {
        ...baseParams,
        sort_by: "created_at",
      }
    ),

    fetchCRMRows(
      endpointMap.deals,
      {
        ...baseParams,
        sort_by: "created_at",
      }
    ),
  ]);

  const leadIndex = buildIndex(
    leadRows,
    ["id", "lead_id"]
  );

  const contactIndex = buildIndex(
    contactRows,
    ["id", "contact_id"]
  );

  const dealIndex = buildIndex(
    dealRows,
    ["id", "deal_id"]
  );

  const rows = normalizeByModule(
    moduleKey,
    currentRows,
    leadIndex,
    contactIndex,
    dealIndex
  );

  return {
    rows,
    metrics: buildMetrics(
      moduleKey,
      rows
    ),
    aiNotes: [
      `Data CRM ${moduleKey} dibaca dari ${endpointMap[moduleKey]}.`,
      "Lead dan Contact pada Pipeline diselesaikan berdasarkan lead_id dan contact_id.",
      "Expected Value tetap menggunakan format Rupiah dan Probability menggunakan persen.",
    ],
  };
}

function createCRMCommandKey(prefix: string) {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${token}`;
}

export async function closeCRMDealWon(dealId: string) {
  const response = await api.post(`/api/v1/crm/deals/${dealId}/close-won`);
  return toModuleRow(response.data);
}

export async function confirmCRMDealPayment(dealId: string) {
  const response = await api.post(
    `/api/v1/crm/deals/${dealId}/confirm-payment`,
    {},
    {
      headers: {
        "Idempotency-Key": createCRMCommandKey("crm-deal-payment"),
      },
    },
  );
  return toModuleRow(response.data);
}
