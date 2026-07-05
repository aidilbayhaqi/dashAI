"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getModuleEndpoint, getScopedQueryParams } from "@/lib/module-crud";
import { useCompanyScope } from "@/hooks/use-company-scope";
import type { ModuleData, ModuleRow } from "@/types/modules";
import type { ProductModuleKey } from "./types";

type LookupMap = Record<string, ModuleRow>;

function normalizeRow(row: unknown): ModuleRow {
  if (!row || typeof row !== "object") return {};

  const source = row as Record<string, unknown>;
  const result: ModuleRow = {};

  Object.entries(source).forEach(([key, value]) => {
    result[key] = value === null || value === undefined ? "" : String(value);
  });

  return result;
}

function normalizeRows(data: unknown): ModuleRow[] {
  if (Array.isArray(data)) return data.map(normalizeRow);

  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as { items: unknown[] }).items)
  ) {
    return (data as { items: unknown[] }).items.map(normalizeRow);
  }

  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as { data: unknown[] }).data)
  ) {
    return (data as { data: unknown[] }).data.map(normalizeRow);
  }

  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown[] }).results)
  ) {
    return (data as { results: unknown[] }).results.map(normalizeRow);
  }

  return [];
}

async function safeGet(endpoint: string, params?: Record<string, unknown>) {
  try {
    const response = await api.get(endpoint, { params });
    return normalizeRows(response.data);
  } catch {
    return [];
  }
}

function toMap(rows: ModuleRow[], key = "id"): LookupMap {
  return rows.reduce<LookupMap>((acc, row) => {
    const id = row[key];

    if (id) {
      acc[id] = row;
    }

    return acc;
  }, {});
}

function toNumber(value: string | undefined) {
  const parsed = Number(value ?? "0");

  if (Number.isNaN(parsed)) return 0;

  return parsed;
}

function formatNumber(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? "0");

  if (Number.isNaN(parsed)) return "0";

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatMoney(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? "0");

  if (Number.isNaN(parsed)) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function shortId(value: string | undefined) {
  if (!value) return "-";

  if (value.length <= 12) return value;

  return `${value.slice(0, 8)}...`;
}

function buildStockSummary(stocks: ModuleRow[]) {
  const summary: Record<
    string,
    {
      quantity: number;
      reserved: number;
      reorder: number;
    }
  > = {};

  stocks.forEach((stock) => {
    const productId = stock.product_id;

    if (!productId) return;

    if (!summary[productId]) {
      summary[productId] = {
        quantity: 0,
        reserved: 0,
        reorder: 0,
      };
    }

    summary[productId].quantity += toNumber(stock.quantity_on_hand);
    summary[productId].reserved += toNumber(stock.reserved_quantity);
    summary[productId].reorder = Math.max(
      summary[productId].reorder,
      toNumber(stock.reorder_point)
    );
  });

  return summary;
}

function getProductStatusFromStock(
  product: ModuleRow,
  stockSummary?: {
    quantity: number;
    reserved: number;
    reorder: number;
  }
) {
  if (product.status) return product.status;

  if (product.track_stock === "false") return "active";

  if (!stockSummary) return "active";

  if (stockSummary.quantity <= stockSummary.reorder) return "low";

  return "active";
}

function resolveBranchName(stock: ModuleRow) {
  return (
    stock.branch_name ||
    stock.branch ||
    stock.warehouse_name ||
    stock.location_name ||
    shortId(stock.branch_id)
  );
}

function buildProductRows({
  moduleKey,
  rows,
  products,
  categories,
  stocks,
}: {
  moduleKey: ProductModuleKey;
  rows: ModuleRow[];
  products: ModuleRow[];
  categories: ModuleRow[];
  stocks: ModuleRow[];
}) {
  const categoryMap = toMap(categories);
  const productMap = toMap(products);
  const stockSummary = buildStockSummary(stocks);

  if (moduleKey === "overview") {
    return rows.map((product) => {
      const category = categoryMap[product.category_id];
      const stock = stockSummary[product.id];

      const stockLabel =
        product.track_stock === "false"
          ? "Non Stock"
          : stock
            ? `${formatNumber(stock.quantity)} ${product.unit || "pcs"}`
            : "-";

      return {
        ...product,
        photo: product.image_url || product.photo || "-",
        name: product.name || "-",
        sku: product.sku || "-",
        category:
          category?.name ||
          product.category_name ||
          product.category ||
          shortId(product.category_id),
        stock: stockLabel,
        price: formatMoney(product.selling_price || product.price),
        status: getProductStatusFromStock(product, stock),
      };
    });
  }

  if (moduleKey === "categories") {
    return rows.map((category) => {
      const relatedProducts = products.filter(
        (product) => product.category_id === category.id
      );

      const revenue = relatedProducts.reduce((total, product) => {
        const productStock = stockSummary[product.id];
        const qty = productStock?.quantity ?? 0;
        const price = toNumber(product.selling_price);

        return total + qty * price;
      }, 0);

      return {
        ...category,
        name: category.name || "-",
        products: String(relatedProducts.length),
        revenue: formatMoney(revenue),
        status:
          category.status ||
          (category.is_active === "false" ? "inactive" : "active"),
      };
    });
  }

  if (moduleKey === "stock") {
    return rows.map((stock) => {
      const product = productMap[stock.product_id];

      const quantity = toNumber(stock.quantity_on_hand);
      const reorder = toNumber(stock.reorder_point);

      return {
        ...stock,
        product:
          product?.name ||
          stock.product_name ||
          stock.product ||
          shortId(stock.product_id),
        sku: product?.sku || stock.sku || "-",
        branch: resolveBranchName(stock),
        stock: `${formatNumber(stock.quantity_on_hand)} ${
          product?.unit || ""
        }`.trim(),
        reserved: formatNumber(stock.reserved_quantity),
        reorder: formatNumber(stock.reorder_point),
        status: quantity <= reorder ? "low" : "ready",
      };
    });
  }

  if (moduleKey === "suppliers") {
    return rows.map((supplier) => {
      return {
        ...supplier,
        name: supplier.name || "-",
        category: supplier.category || "-",
        leadTime: supplier.lead_time_days
          ? `${supplier.lead_time_days} hari`
          : supplier.leadTime || "-",
        status: supplier.status || "active",
      };
    });
  }

  return rows;
}

export function useProductModule(moduleKey: ProductModuleKey) {
  const selectedCompanyId = useCompanyScope();

  return useQuery<ModuleData>({
    queryKey: ["product", moduleKey, selectedCompanyId],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = getScopedQueryParams("product");
      const currentEndpoint = getModuleEndpoint("product", moduleKey);

      const [currentRows, products, categories, stocks] = await Promise.all([
        safeGet(currentEndpoint, params),
        safeGet("/api/v1/products/items", params),
        safeGet("/api/v1/products/categories", params),
        safeGet("/api/v1/products/stocks", params),
      ]);

      const rows = buildProductRows({
        moduleKey,
        rows: currentRows,
        products,
        categories,
        stocks,
      });

      return {
        metrics: [],
        rows,
        aiNotes: [],
      };
    },
  });
}