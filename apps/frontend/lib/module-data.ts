import { api } from "@/lib/api";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";
import type { ModuleData, ModuleMetric, ModuleRow } from "@/types/modules";
import {
  type FeatureKey,
  type ModuleResourceConfig,
  type RelationConfig,
  getModuleResource,
} from "@/lib/module-registry";

type RawRecord = Record<string, unknown>;

const companyScopedFeatures: FeatureKey[] = ["product", "hr", "crm", "finance"];

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getApiBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (fromEnv) return fromEnv.replace(/\/$/, "");

  return "http://localhost:8000";
}

function normalizeFileUrl(value: unknown) {
  if (!hasValue(value)) return "";

  const url = String(value).trim();

  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  if (url.startsWith("/uploads")) {
    return `${getApiBaseUrl()}${url}`;
  }

  if (url.startsWith("uploads/")) {
    return `${getApiBaseUrl()}/${url}`;
  }

  return url;
}

function normalizeNestedObject(value: RawRecord) {
  const nestedValue =
    value.name ??
    value.full_name ??
    value.company_name ??
    value.branch_name ??
    value.category_name ??
    value.product_name ??
    value.supplier_name ??
    value.employee_name ??
    value.cash_account_name ??
    value.account_name ??
    value.title ??
    value.email ??
    value.phone ??
    value.code ??
    value.sku;

  if (hasValue(nestedValue)) return String(nestedValue);

  return JSON.stringify(value);
}

function normalizeRow(row: unknown): ModuleRow {
  if (!row || typeof row !== "object") return {};

  const source = row as RawRecord;
  const result: ModuleRow = {};

  Object.entries(source).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      result[key] = "";
      return;
    }

    if (value instanceof Date) {
      result[key] = value.toISOString();
      return;
    }

    if (typeof value === "object") {
      result[key] = normalizeNestedObject(value as RawRecord);
      return;
    }

    result[key] = String(value);
  });

  return result;
}

function normalizeRows(data: unknown): ModuleRow[] {
  if (Array.isArray(data)) return data.map(normalizeRow);

  if (!data || typeof data !== "object") return [];

  const record = data as RawRecord;

  if (Array.isArray(record.items)) return record.items.map(normalizeRow);
  if (Array.isArray(record.data)) return record.data.map(normalizeRow);
  if (Array.isArray(record.results)) return record.results.map(normalizeRow);
  if (Array.isArray(record.rows)) return record.rows.map(normalizeRow);

  return [];
}

function uniqueRows(rows: ModuleRow[]) {
  const seen = new Set<string>();

  return rows.filter((row, index) => {
    const key =
      row.id ||
      row.sku ||
      row.code ||
      row.employee_no ||
      row.transaction_no ||
      row.invoice_no ||
      row.journal_no ||
      row.email ||
      row.phone ||
      row.name ||
      String(index);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getScopedQueryParams(featureKey: FeatureKey) {
  if (!companyScopedFeatures.includes(featureKey)) {
    return {};
  }

  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  if (
    currentCompanyId &&
    isValidUuid(currentCompanyId) &&
    !isCurrentUserSuperAdmin()
  ) {
    return {
      company_id: currentCompanyId,
    };
  }

  if (
    selectedCompanyId &&
    selectedCompanyId !== "all" &&
    isValidUuid(selectedCompanyId)
  ) {
    return {
      company_id: selectedCompanyId,
    };
  }

  return {};
}

function getCompanyIdFromScopeOrRows(rows: ModuleRow[]) {
  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  if (
    currentCompanyId &&
    isValidUuid(currentCompanyId) &&
    !isCurrentUserSuperAdmin()
  ) {
    return currentCompanyId;
  }

  if (
    selectedCompanyId &&
    selectedCompanyId !== "all" &&
    isValidUuid(selectedCompanyId)
  ) {
    return selectedCompanyId;
  }

  for (const row of rows) {
    const companyId = row.company_id;

    if (companyId && isValidUuid(String(companyId))) {
      return String(companyId);
    }
  }

  return "";
}

function buildEndpoint(endpoint: string, companyId: string) {
  return endpoint.replace("{company_id}", companyId);
}

async function safeGetRows(
  endpoint: string,
  params: Record<string, unknown> = {}
) {
  try {
    const response = await api.get(endpoint, {
      params: {
        limit: 100,
        sort_order: "desc",
        ...params,
      },
    });

    return uniqueRows(normalizeRows(response.data));
  } catch (error) {
    console.warn(`[module-data] Failed to fetch ${endpoint}`, error);
    return [];
  }
}

function getReadableValue(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value) && !isValidUuid(String(value))) {
      return String(value);
    }
  }

  return "";
}

function buildRelationIndex(rows: ModuleRow[]) {
  const index: Record<string, ModuleRow> = {};

  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (!key.endsWith("_id") && key !== "id") return;
      if (!hasValue(value)) return;

      index[String(value)] = row;
    });
  });

  return index;
}

async function fetchRelationRows({
  relation,
  baseRows,
  scopedParams,
}: {
  relation: RelationConfig;
  baseRows: ModuleRow[];
  scopedParams: Record<string, unknown>;
}) {
  const companyId = getCompanyIdFromScopeOrRows(baseRows);

  if (relation.requiresCompanyId && !companyId) {
    return [];
  }

  const endpoint = buildEndpoint(relation.endpoint, companyId);

  const params =
    relation.name === "companies"
      ? {}
      : {
          ...scopedParams,
        };

  return safeGetRows(endpoint, params);
}

async function fetchRelations(
  resource: ModuleResourceConfig,
  baseRows: ModuleRow[],
  scopedParams: Record<string, unknown>
) {
  const relationEntries = await Promise.all(
    (resource.relations ?? []).map(async (relation) => {
      const rows = await fetchRelationRows({
        relation,
        baseRows,
        scopedParams,
      });

      return [relation.name, rows] as const;
    })
  );

  return Object.fromEntries(relationEntries) as Record<string, ModuleRow[]>;
}

function resolveRelations({
  resource,
  rows,
  relationData,
}: {
  resource: ModuleResourceConfig;
  rows: ModuleRow[];
  relationData: Record<string, ModuleRow[]>;
}) {
  const relations = resource.relations ?? [];

  return rows.map((row) => {
    const resolvedRow: ModuleRow = {
      ...row,
    };

    relations.forEach((relation) => {
      const foreignValue = row[relation.foreignKey];

      if (!hasValue(foreignValue)) return;

      const relationRows = relationData[relation.name] ?? [];
      const relationIndex = buildRelationIndex(relationRows);
      const target = relationIndex[String(foreignValue)];

      if (!target) return;

      const displayValue = getReadableValue(target, relation.displayKeys);

      if (!displayValue) return;

      resolvedRow[relation.displayField] = displayValue;

      const baseKey = relation.foreignKey.replace(/_id$/, "");
      resolvedRow[`${baseKey}_display`] = displayValue;
      resolvedRow[`${baseKey}_label`] = displayValue;
    });

    return resolvedRow;
  });
}

function parseNumber(value: unknown) {
  if (!hasValue(value)) return 0;

  const cleaned = String(value)
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "")
    .replace(/[^\d.,-]/g, "");

  if (!cleaned) return 0;

  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replaceAll(".", "").replace(",", ".")
      : cleaned.replace(",", ".");

  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parseNumber(value));
}

function formatDate(value: unknown) {
  if (!hasValue(value)) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusText(value: unknown) {
  if (!hasValue(value)) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBoolean(value: unknown) {
  if (!hasValue(value)) return "-";

  const normalized = String(value).toLowerCase();

  if (["true", "1", "yes", "balanced"].includes(normalized)) {
    return "Yes";
  }

  if (["false", "0", "no", "unbalanced"].includes(normalized)) {
    return "No";
  }

  return statusText(value);
}

function pickFirst(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) return value;
  }

  return "";
}

function computeOutstanding(row: ModuleRow) {
  const total = parseNumber(row.total_amount);
  const paid = parseNumber(row.paid_amount);

  return Math.max(total - paid, 0);
}

function computeLedgerBalance(row: ModuleRow) {
  const debit = parseNumber(row.total_debit);
  const credit = parseNumber(row.total_credit);

  return debit - credit;
}

function withDisplayFields(
  featureKey: FeatureKey,
  moduleKey: string,
  rows: ModuleRow[]
) {
  return rows.map((row) => {
    if (featureKey === "product") {
      return {
        ...row,

        company: row.company_name ?? row.company_display,
        branch: row.branch_name ?? row.branch_display ?? row.branch,

        product:
          row.product_name ??
          row.product_display ??
          row.name ??
          row.sku,

        category:
          row.category_name ??
          row.category_display ??
          row.category,

        supplier:
          row.supplier_name ??
          row.supplier_display ??
          row.supplier ??
          row.name,

        image_url: normalizeFileUrl(
          pickFirst(row, ["image_url", "photo_url", "photo", "attachment_url"])
        ),
        photo: normalizeFileUrl(
          pickFirst(row, ["image_url", "photo_url", "photo", "attachment_url"])
        ),
        photo_url: normalizeFileUrl(
          pickFirst(row, ["image_url", "photo_url", "photo", "attachment_url"])
        ),

        price: formatMoney(row.selling_price ?? row.price),
        selling_price_display: formatMoney(row.selling_price ?? row.price),
        cost_price_display: formatMoney(row.cost_price),

        stock:
          row.quantity_on_hand ??
          row.stock ??
          row.quantity ??
          "0",

        quantity_on_hand:
          row.quantity_on_hand ??
          row.stock ??
          row.quantity ??
          "0",

        reserved_quantity:
          row.reserved_quantity ??
          row.reserved ??
          "0",

        reorder_point:
          row.reorder_point ??
          row.reorder ??
          "0",

        lead_time:
          row.lead_time_days ??
          row.lead_time ??
          "0",

        status_label: statusText(row.status ?? row.is_active),
      };
    }

    if (featureKey === "hr") {
      const employeeName = pickFirst(row, [
        "employee_name",
        "employee_display",
        "full_name",
        "name",
      ]);

      const leaveType = pickFirst(row, [
        "leave_type_name",
        "leave_type_display",
        "leave_type",
      ]);

      const reviewer = pickFirst(row, [
        "reviewer_name",
        "reviewer_display",
        "reviewer_email",
      ]);

      const approver = pickFirst(row, [
        "approved_by_name",
        "approver_name",
        "approver_display",
      ]);

      return {
        ...row,

        company: row.company_name ?? row.company_display,
        branch: row.branch_name ?? row.branch_display ?? row.branch,

        employee: employeeName,
        employee_name: row.employee_name ?? employeeName,

        name: row.name ?? row.full_name ?? employeeName,
        full_name: row.full_name ?? row.name ?? employeeName,

        department:
          row.department_name ??
          row.department ??
          "-",

        position:
          row.job_title ??
          row.position ??
          "-",

        job_title:
          row.job_title ??
          row.position ??
          "-",

        employment:
          row.employment_type ??
          row.employment ??
          "-",

        salary: formatMoney(row.base_salary ?? row.salary),
        base_salary_display: formatMoney(row.base_salary ?? row.salary),

        attendance_date_display: formatDate(row.attendance_date),
        check_in: row.check_in_at ?? row.clock_in ?? "-",
        check_out: row.check_out_at ?? row.clock_out ?? "-",

        work_minutes:
          row.work_minutes ??
          row.working_minutes ??
          "0",

        overtime_minutes:
          row.overtime_minutes ??
          row.overtime ??
          "0",

        leave_type: leaveType,
        leave_type_name: row.leave_type_name ?? leaveType,

        start_date_display: formatDate(row.start_date),
        end_date_display: formatDate(row.end_date),

        total_days:
          row.total_days ??
          row.days ??
          "0",

        reviewer,
        approver,
        approved_by: approver,

        due_date_display: formatDate(row.due_date),
        task_title: row.title ?? row.task_title ?? "-",

        priority_label: statusText(row.priority),

        period:
          row.review_period ??
          row.period ??
          row.period_start ??
          "-",

        period_start_display: formatDate(row.period_start),
        period_end_display: formatDate(row.period_end),

        gross: formatMoney(row.total_gross),
        deduction: formatMoney(row.total_deduction),
        net: formatMoney(row.total_net),

        target: row.target_value ?? row.target ?? "-",
        actual: row.actual_value ?? row.actual ?? "-",
        weight: row.weight_score ?? row.weight ?? "-",
        score: row.total_score ?? row.score ?? "-",

        status_label: statusText(row.status),
      };
    }

    if (featureKey === "crm") {
      const lead = pickFirst(row, [
        "lead_name",
        "lead_display",
        "lead",
        "name",
      ]);

      const contact = pickFirst(row, [
        "contact_name",
        "contact_display",
        "contact",
        "name",
      ]);

      const deal = pickFirst(row, [
        "deal_name",
        "deal_display",
        "deal",
        "title",
        "name",
      ]);

      const owner = pickFirst(row, [
        "owner_name",
        "owner_display",
        "owner_email",
        "owner",
      ]);

      const assignee = pickFirst(row, [
        "assigned_user_name",
        "assigned_user_display",
        "assignee_name",
        "assignee",
      ]);

      return {
        ...row,

        company: row.company_name ?? row.company_display,
        branch: row.branch_name ?? row.branch_display ?? row.branch,

        lead,
        lead_name: row.lead_name ?? lead,

        contact,
        contact_name: row.contact_name ?? contact,

        customer:
          row.customer_name ??
          row.company_name ??
          row.contact_name ??
          contact,

        deal,
        deal_name: row.deal_name ?? deal,

        owner,
        assignee,
        assigned_to: assignee,

        title:
          row.title ??
          row.deal_name ??
          row.subject ??
          row.name ??
          "-",

        stage_label: statusText(row.stage),
        source_label: statusText(row.source),
        channel_label: statusText(row.channel),
        activity_type_label: statusText(row.activity_type),

        estimated_value_display: formatMoney(row.estimated_value),
        value: formatMoney(row.estimated_value ?? row.value),

        probability:
          row.probability_percent ??
          row.probability ??
          "0",

        expected_close_date_display: formatDate(row.expected_close_date),

        due_date:
          row.due_at ??
          row.activity_date ??
          row.scheduled_at ??
          "-",

        due_date_display: formatDate(
          row.due_at ??
            row.activity_date ??
            row.scheduled_at
        ),

        campaign:
          row.campaign_name ??
          row.name ??
          "-",

        budget: formatMoney(row.budget_amount ?? row.budget),
        budget_amount_display: formatMoney(row.budget_amount ?? row.budget),

        leads:
          row.leads_count ??
          row.lead_count ??
          "0",

        start_date_display: formatDate(row.start_date),
        end_date_display: formatDate(row.end_date),

        status_label: statusText(row.status),
      };
    }

    if (featureKey === "finance") {
      const transactionType = pickFirst(row, [
        "transaction_type",
        "type",
        "transactionType",
      ]);

      const cashflowActivity = pickFirst(row, [
        "cashflow_activity",
        "activity",
        "cashflowActivity",
      ]);

      const attachmentUrl = normalizeFileUrl(
        pickFirst(row, [
          "attachment_url",
          "proof_url",
          "receipt_url",
          "document_url",
          "file_url",
          "attachment",
          "proof",
        ])
      );

      const counterparty = pickFirst(row, [
        "counterparty_name",
        "counterparty",
        "client_name",
        "customer_name",
        "vendor_name",
        "supplier_name",
      ]);

      const dateSource = pickFirst(row, [
        "transaction_date",
        "invoice_date",
        "report_date",
        "journal_date",
        "tax_period",
        "created_at",
      ]);

      const amountSource = pickFirst(row, [
        "total_amount",
        "tax_amount",
        "net_cashflow",
        "total_debit",
        "amount",
      ]);

      const outstandingAmount = computeOutstanding(row);
      const ledgerBalance = computeLedgerBalance(row);

      const operatingCashIn = parseNumber(row.operating_cash_in);
      const operatingCashOut = parseNumber(row.operating_cash_out);
      const investingCashIn = parseNumber(row.investing_cash_in);
      const investingCashOut = parseNumber(row.investing_cash_out);
      const financingCashIn = parseNumber(row.financing_cash_in);
      const financingCashOut = parseNumber(row.financing_cash_out);

      const totalCashIn =
        operatingCashIn + investingCashIn + financingCashIn;

      const totalCashOut =
        operatingCashOut + investingCashOut + financingCashOut;

      return {
        ...row,

        company: row.company_name ?? row.company_display,
        branch: row.branch_name ?? row.branch_display,

        account_name:
          row.cash_account_name ??
          row.cash_account_display ??
          row.account_name,

        cash_account:
          row.cash_account_name ??
          row.cash_account_display ??
          row.account_name,

        period:
          row.period_name ??
          row.period_display ??
          row.tax_period ??
          row.report_date,

        date: formatDate(dateSource),
        amount: formatMoney(amountSource),
        total: formatMoney(row.total_amount),
        total_amount_display: formatMoney(row.total_amount),

        status_label: statusText(row.status),

        type: statusText(transactionType),
        transaction_type: row.transaction_type ?? transactionType,
        transaction_type_label: statusText(transactionType),

        activity: statusText(cashflowActivity),
        cashflow_activity: row.cashflow_activity ?? cashflowActivity,
        cashflow_activity_label: statusText(cashflowActivity),

        counterparty,
        counterparty_name: row.counterparty_name ?? counterparty,

        attachment: attachmentUrl,
        attachment_url: row.attachment_url ?? attachmentUrl,
        proof: attachmentUrl,
        proof_url: row.proof_url ?? attachmentUrl,

        subtotal: formatMoney(row.subtotal_amount),
        subtotal_amount_display: formatMoney(row.subtotal_amount),

        discount: formatMoney(row.discount_amount),
        discount_amount_display: formatMoney(row.discount_amount),

        reference: row.reference_no ?? row.transaction_no ?? "-",

        transaction_date_display: formatDate(row.transaction_date),

        client: row.client_name ?? row.customer_name ?? row.counterparty_name,
        customer: row.client_name ?? row.customer_name ?? row.counterparty_name,

        invoice_date_display: formatDate(row.invoice_date),
        due_date_display: formatDate(row.due_date),

        paid: formatMoney(row.paid_amount),
        paid_amount_display: formatMoney(row.paid_amount),

        outstanding: formatMoney(outstandingAmount),
        outstanding_amount: String(outstandingAmount),
        outstanding_amount_display: formatMoney(outstandingAmount),

        report_date_display: formatDate(row.report_date),

        opening_balance: formatMoney(row.beginning_cash_balance),
        beginning_cash_balance_display: formatMoney(row.beginning_cash_balance),

        cash_in: formatMoney(totalCashIn),
        cash_out: formatMoney(totalCashOut),

        operating_cash_in_display: formatMoney(row.operating_cash_in),
        operating_cash_out_display: formatMoney(row.operating_cash_out),

        investing_cash_in_display: formatMoney(row.investing_cash_in),
        investing_cash_out_display: formatMoney(row.investing_cash_out),

        financing_cash_in_display: formatMoney(row.financing_cash_in),
        financing_cash_out_display: formatMoney(row.financing_cash_out),

        net_cashflow_display: formatMoney(row.net_cashflow),

        closing_balance: formatMoney(row.ending_cash_balance),
        ending_cash_balance_display: formatMoney(row.ending_cash_balance),

        tax_type: row.tax_type,
        tax_type_label: statusText(row.tax_type),

        taxable: formatMoney(row.taxable_amount),
        taxable_amount_display: formatMoney(row.taxable_amount),

        tax_amount_display: formatMoney(row.tax_amount),

        tax_period_display: row.tax_period ?? "-",
        paid_date_display: formatDate(row.paid_date),
        reported_date_display: formatDate(row.reported_date),

        entry_date: formatDate(row.journal_date),
        journal_date_display: formatDate(row.journal_date),

        memo: row.memo ?? row.description ?? "-",

        debit: formatMoney(row.total_debit),
        total_debit_display: formatMoney(row.total_debit),

        credit: formatMoney(row.total_credit),
        total_credit_display: formatMoney(row.total_credit),

        balance: formatMoney(ledgerBalance),
        balance_display: formatMoney(ledgerBalance),

        is_balanced_label: formatBoolean(row.is_balanced),
      };
    }

    return row;
  });
}

function buildMetrics(featureKey: FeatureKey, rows: ModuleRow[]): ModuleMetric[] {
  if (featureKey === "finance") {
    const income = rows
      .filter((row) => String(row.transaction_type).toLowerCase() === "income")
      .reduce((total, row) => total + parseNumber(row.total_amount), 0);

    const expense = rows
      .filter((row) => String(row.transaction_type).toLowerCase() === "expense")
      .reduce((total, row) => total + parseNumber(row.total_amount), 0);

    return [
      {
        label: "Income",
        value: formatMoney(income),
        helper: "Total transaksi income.",
        trend: income > 0 ? "Tracked" : "Empty",
      },
      {
        label: "Expense",
        value: formatMoney(expense),
        helper: "Total transaksi expense.",
        trend: expense > 0 ? "Tracked" : "Empty",
      },
      {
        label: "Records",
        value: String(rows.length),
        helper: "Total data pada module ini.",
        trend: "Synced",
      },
    ];
  }

  if (featureKey === "crm") {
    return [
      {
        label: "Records",
        value: String(rows.length),
        helper: "Total data CRM yang berhasil dibaca.",
        trend: rows.length > 0 ? "Synced" : "Empty",
      },
    ];
  }

  if (featureKey === "hr") {
    return [
      {
        label: "Records",
        value: String(rows.length),
        helper: "Total data HR yang berhasil dibaca.",
        trend: rows.length > 0 ? "Synced" : "Empty",
      },
    ];
  }

  return [
    {
      label: "Records",
      value: String(rows.length),
      helper: "Total data yang berhasil dibaca dari API.",
      trend: rows.length > 0 ? "Synced" : "Empty",
    },
  ];
}

export async function getModuleData(
  featureKey: FeatureKey,
  moduleKey?: string
): Promise<ModuleData> {
  const resource = getModuleResource(featureKey, moduleKey);
  const scopedParams = getScopedQueryParams(featureKey);

  const baseRows = await safeGetRows(resource.endpoint, {
    ...scopedParams,
    sort_by: resource.sortBy,
  });

  const relationData = await fetchRelations(resource, baseRows, scopedParams);

  const resolvedRows = resolveRelations({
    resource,
    rows: baseRows,
    relationData,
  });

  const rows = withDisplayFields(featureKey, resource.moduleKey, resolvedRows);

  return {
    rows,
    metrics: buildMetrics(featureKey, rows),
    aiNotes: [
      `${featureKey}/${resource.moduleKey} berhasil dibaca dari ${resource.endpoint}.`,
      "Relation UUID di-resolve ke field display jika lookup tersedia.",
      "Field backend dan field table lama sudah diberi alias display agar data tidak kosong.",
    ],
  };
}