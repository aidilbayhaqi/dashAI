import type { ModuleData } from "@/types/modules";
import type { ProductModuleKey } from "./types";

function emptyModuleData({
  label,
  helper,
  endpoint,
}: {
  label: string;
  helper: string;
  endpoint: string;
}): ModuleData {
  return {
    metrics: [
      {
        label,
        value: "0",
        helper,
        trend: "Empty",
      },
    ],
    rows: [],
    aiNotes: [
      `Data akan dibaca dari API ${endpoint}.`,
      "Dummy data ini hanya fallback agar UI tetap aman saat API belum tersedia.",
    ],
  };
}

export const productDummyData: Record<ProductModuleKey, ModuleData> = {
  overview: emptyModuleData({
    label: "Total Products",
    helper: "Belum ada product item yang tercatat.",
    endpoint: "/api/v1/products/items",
  }),

  categories: emptyModuleData({
    label: "Total Categories",
    helper: "Belum ada kategori produk yang tercatat.",
    endpoint: "/api/v1/products/categories",
  }),

  stock: emptyModuleData({
    label: "Total Stock Records",
    helper: "Belum ada data stock produk yang tercatat.",
    endpoint: "/api/v1/products/stocks",
  }),

  suppliers: emptyModuleData({
    label: "Total Suppliers",
    helper: "Belum ada supplier yang tercatat.",
    endpoint: "/api/v1/products/suppliers",
  }),
};