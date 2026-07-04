import { api } from "@/lib/api";
import type { ModuleData, ModuleRow } from "@/types/modules";
import type { ProductModuleKey } from "./types";
import { productDummyData } from "./dummy";

const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY_API === "true";

type BackendProduct = {
  id?: string;
  name?: string;
  sku?: string;
  selling_price?: number | string;
  cost_price?: number | string;
  status?: string;
  image_url?: string | null;
  photo_url?: string | null;
  track_stock?: boolean;
  quantity_on_hand?: number | string;
  stock?: number | string;
};

type BackendPaginatedResponse<T> = {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    total_pages?: number;
  };
};

function formatRupiah(value: unknown) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatStatus(value: unknown) {
  if (!value) return "Active";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeInitial(value: unknown) {
  const text = String(value || "Product");

  return text
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function productToRow(product: BackendProduct): ModuleRow {
  const photo = product.image_url || product.photo_url || makeInitial(product.name);

  return {
    id: String(product.id ?? ""),
    photo: String(photo),
    name: String(product.name ?? "-"),
    sku: String(product.sku ?? "-"),
    stock: String(product.quantity_on_hand ?? product.stock ?? "-"),
    price: formatRupiah(product.selling_price),
    status: formatStatus(product.status),
  };
}

function makeProductModuleData(rows: ModuleRow[]): ModuleData {
  const lowStockCount = rows.filter((row) =>
    row.status.toLowerCase().includes("low")
  ).length;

  return {
    metrics: [
      {
        label: "Total Products",
        value: String(rows.length),
        helper: "Data product dari backend API",
      },
      {
        label: "Low Stock",
        value: String(lowStockCount),
        helper: "Produk yang butuh perhatian stok",
      },
      {
        label: "Source",
        value: "API",
        helper: "Fetched from FastAPI backend",
      },
    ],
    rows,
    aiNotes: [
      "Data Product Management sudah berhasil disiapkan dari endpoint backend.",
      "Kolom photo akan memakai image_url/photo_url kalau backend sudah menyediakan. Kalau belum, memakai initial otomatis.",
    ],
  };
}

export async function getProductModuleData(
  moduleKey: ProductModuleKey
): Promise<ModuleData> {
  if (USE_DUMMY) {
    return productDummyData[moduleKey];
  }

  if (moduleKey !== "overview") {
    return productDummyData[moduleKey];
  }

  const response = await api.get<
    BackendPaginatedResponse<BackendProduct> | BackendProduct[]
  >("/api/v1/products/items", {
    params: {
      limit: 100,
    },
  });

  const products = Array.isArray(response.data)
    ? response.data
    : response.data.data;

  const rows = products.map(productToRow);

  return makeProductModuleData(rows);
}