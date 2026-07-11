"use client";

import { useQuery } from "@tanstack/react-query";

import { useCompanyScope } from "@/hooks/use-company-scope";
import { api } from "@/lib/api";
import { getScopedQueryParams } from "@/lib/module-crud";
import type { ModuleData, ModuleMetric, ModuleRow } from "@/types/modules";
import type { ProductModuleKey } from "./types";
import { normalizeProductModuleKey } from "./types";

type RawRecord = Record<string, unknown>;

const productEndpoints: Record<ProductModuleKey, string> = {
  overview: "/api/v1/products/items",
  categories: "/api/v1/products/categories",
  stock: "/api/v1/products/stocks",
  suppliers: "/api/v1/products/suppliers",
};

const productSortBy: Record<ProductModuleKey, string> = {
  overview: "updated_at",
  categories: "updated_at",
  stock: "updated_at",
  suppliers: "updated_at",
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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

function pick(row: ModuleRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (hasValue(value)) {
      return String(value);
    }
  }

  return "";
}

function normalizeNestedObject(value: RawRecord) {
  const readableValue =
    value.name ??
    value.full_name ??
    value.company_name ??
    value.branch_name ??
    value.category_name ??
    value.product_name ??
    value.supplier_name ??
    value.sku ??
    value.code ??
    value.email ??
    value.phone;

  if (hasValue(readableValue)) return String(readableValue);

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
  if (Array.isArray(data)) {
    return data.map(normalizeRow);
  }

  if (!data || typeof data !== "object") {
    return [];
  }

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
      row.email ||
      row.phone ||
      row.name ||
      String(index);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
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
    console.warn(`[product] Failed to fetch ${endpoint}`, error);
    return [];
  }
}

function buildIndex(rows: ModuleRow[]) {
  const index: Record<string, ModuleRow> = {};

  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key !== "id" && !key.endsWith("_id")) return;
      if (!hasValue(value)) return;

      index[String(value)] = row;
    });
  });

  return index;
}

function getReadableValue(row: ModuleRow | undefined, keys: string[]) {
  if (!row) return "";

  for (const key of keys) {
    const value = row[key];

    if (!hasValue(value)) continue;

    const stringValue = String(value);

    if (isUuid(stringValue)) continue;

    return stringValue;
  }

  return "";
}

function resolveRelation({
  row,
  foreignKey,
  rows,
  displayKeys,
  fallback = "",
}: {
  row: ModuleRow;
  foreignKey: string;
  rows: ModuleRow[];
  displayKeys: string[];
  fallback?: string;
}) {
  const id = row[foreignKey];

  if (!hasValue(id)) return fallback;

  const index = buildIndex(rows);
  const target = index[String(id)];

  const readable = getReadableValue(target, displayKeys);

  return readable || fallback;
}

function formatMoney(value: unknown) {
  const raw = String(value ?? "")
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "")
    .replace(/[^\d.,-]/g, "");

  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replaceAll(".", "").replace(",", ".")
      : raw.replace(",", ".");

  const numberValue = Number(normalized);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(numberValue) ? 0 : numberValue);
}

function statusText(value: unknown) {
  if (!hasValue(value)) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildProductRows({
  moduleKey,
  rows,
  categories,
  products,
  suppliers,
  companies,
  branches,
}: {
  moduleKey: ProductModuleKey;
  rows: ModuleRow[];
  categories: ModuleRow[];
  products: ModuleRow[];
  suppliers: ModuleRow[];
  companies: ModuleRow[];
  branches: ModuleRow[];
}) {
  return rows.map((row) => {
    const companyName = resolveRelation({
      row,
      foreignKey: "company_id",
      rows: companies,
      displayKeys: ["name", "legal_name", "company_name", "display_name"],
    });

    const branchName = resolveRelation({
      row,
      foreignKey: "branch_id",
      rows: branches,
      displayKeys: ["name", "branch_name", "branch_code", "code"],
    });

    const categoryName = resolveRelation({
      row,
      foreignKey: "category_id",
      rows: categories,
      displayKeys: ["name", "category_name", "code"],
    });

    const parentCategoryName = resolveRelation({
      row,
      foreignKey: "parent_category_id",
      rows: categories,
      displayKeys: ["name", "category_name", "code"],
    });

    const productName = resolveRelation({
      row,
      foreignKey: "product_id",
      rows: products,
      displayKeys: ["name", "product_name", "sku"],
    });

    const supplierName = resolveRelation({
      row,
      foreignKey: "supplier_id",
      rows: suppliers,
      displayKeys: ["name", "supplier_name", "email", "phone"],
    });

    const imageUrl = normalizeFileUrl(
      pick(row, ["image_url", "photo_url", "photo", "attachment_url"])
    );

    const baseRow: ModuleRow = {
      ...row,

      company_name: companyName,
      company_display: companyName,

      branch_name: branchName,
      branch_display: branchName,

      category_name: categoryName,
      category_display: categoryName,

      parent_category_name: parentCategoryName,
      parent_category_display: parentCategoryName,

      product_name: productName || pick(row, ["name", "sku"]),
      product_display: productName || pick(row, ["name", "sku"]),

      supplier_name: supplierName || pick(row, ["name"]),
      supplier_display: supplierName || pick(row, ["name"]),

      image_url: imageUrl,
      photo: imageUrl,
      photo_url: imageUrl,

      price: formatMoney(pick(row, ["selling_price", "price"])),
      cost_price_display: formatMoney(row.cost_price),
      selling_price_display: formatMoney(row.selling_price),

      stock: pick(row, ["quantity_on_hand", "stock"]) || "0",
      reserved: pick(row, ["reserved_quantity", "reserved"]) || "0",
      reorder: pick(row, ["reorder_point", "reorder"]) || "0",

      status_label: statusText(row.status),
    };

    if (moduleKey === "categories") {
      return {
        ...baseRow,
        parent_category: parentCategoryName || "-",
        status_label: statusText(row.is_active || row.status),
      };
    }

    if (moduleKey === "stock") {
      return {
        ...baseRow,
        product: productName || "Product belum terbaca",
        branch: branchName || "Branch belum terbaca",
        quantity_on_hand:
          pick(row, ["quantity_on_hand", "stock", "quantity"]) || "0",
        reserved_quantity:
          pick(row, ["reserved_quantity", "reserved"]) || "0",
        reorder_point: pick(row, ["reorder_point", "reorder"]) || "0",
      };
    }

    if (moduleKey === "suppliers") {
      return {
        ...baseRow,
        supplier: pick(row, ["name", "supplier_name"]) || supplierName,
        contact:
          pick(row, ["contact_person", "email", "phone"]) || "-",
        lead_time:
          pick(row, ["lead_time_days", "lead_time"]) || "0",
      };
    }

    return baseRow;
  });
}

function buildProductMetrics(moduleKey: ProductModuleKey, rows: ModuleRow[]): ModuleMetric[] {
  const labelMap: Record<ProductModuleKey, string> = {
    overview: "Products",
    categories: "Categories",
    stock: "Stock Records",
    suppliers: "Suppliers",
  };

  return [
    {
      label: `Total ${labelMap[moduleKey]}`,
      value: String(rows.length),
      helper: "Data berhasil dibaca dari API backend.",
      trend: rows.length > 0 ? "Synced" : "Empty",
    },
  ];
}

async function fetchBranches(params: Record<string, unknown>, baseRows: ModuleRow[]) {
  const companyIdFromParam =
    typeof params.company_id === "string" ? params.company_id : "";

  const companyIdFromRows =
    baseRows
      .map((row) => row.company_id)
      .find((value) => hasValue(value) && isUuid(String(value))) ?? "";

  const companyId = companyIdFromParam || String(companyIdFromRows);

  if (!companyId) return [];

  return safeGetRows(`/api/v1/companies/${companyId}/branches`, {
    limit: 100,
    sort_by: "created_at",
    sort_order: "desc",
  });
}

export function useProductModule(moduleKey: ProductModuleKey | string) {
  const selectedCompanyId = useCompanyScope();
  const safeModuleKey = normalizeProductModuleKey(String(moduleKey));
  const endpoint = productEndpoints[safeModuleKey];

  return useQuery<ModuleData>({
    queryKey: ["product", safeModuleKey, selectedCompanyId],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = getScopedQueryParams("product");

      const rows = await safeGetRows(endpoint, {
        ...params,
        sort_by: productSortBy[safeModuleKey],
      });

      const [companies, categories, products, suppliers, branches] =
        await Promise.all([
          safeGetRows("/api/v1/companies", {
            limit: 100,
            sort_by: "created_at",
          }),
          safeGetRows("/api/v1/products/categories", {
            ...params,
            limit: 100,
            sort_by: "created_at",
          }),
          safeGetRows("/api/v1/products/items", {
            ...params,
            limit: 100,
            sort_by: "created_at",
          }),
          safeGetRows("/api/v1/products/suppliers", {
            ...params,
            limit: 100,
            sort_by: "created_at",
          }),
          fetchBranches(params, rows),
        ]);

      const resolvedRows = buildProductRows({
        moduleKey: safeModuleKey,
        rows,
        categories,
        products,
        suppliers,
        companies,
        branches,
      });

      return {
        rows: resolvedRows,
        metrics: buildProductMetrics(safeModuleKey, resolvedRows),
        aiNotes: [
          `Product/${safeModuleKey} dibaca dari ${endpoint}.`,
          "Category, stock, supplier, branch, dan company relation sudah di-resolve jika lookup tersedia.",
          "Photo URL /uploads sudah diarahkan ke backend agar gambar tampil di frontend.",
        ],
      };
    },
  });
}