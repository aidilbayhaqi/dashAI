import { Package, PackageCheck, Tags, Warehouse } from "lucide-react";
import type { ModuleConfig } from "@/types/modules";
import type { ProductModuleKey } from "./types";

export const productModuleConfig: Record<ProductModuleKey, ModuleConfig> = {
  overview: {
    badge: "Operations / Inventory",
    title: "Product Management",
    description:
      "Kelola produk, SKU, kategori, stok, supplier, harga, dan performa inventory.",
    icon: Package,
    columns: [
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "stock", label: "Stock" },
      { key: "price", label: "Price" },
      { key: "status", label: "Status" },
    ],
  },
  categories: {
    badge: "Operations / Product Categories",
    title: "Product Categories",
    description:
      "Atur kategori produk agar katalog, reporting, dan analisis inventory lebih terstruktur.",
    icon: Tags,
    columns: [
      { key: "name", label: "Category" },
      { key: "products", label: "Products" },
      { key: "revenue", label: "Revenue" },
      { key: "status", label: "Status" },
    ],
  },
  stock: {
    badge: "Operations / Stock Control",
    title: "Stock Control",
    description:
      "Monitor stok, reorder point, warehouse, dan item yang butuh restock.",
    icon: Warehouse,
    columns: [
      { key: "item", label: "Item" },
      { key: "warehouse", label: "Warehouse" },
      { key: "stock", label: "Stock" },
      { key: "minimum", label: "Minimum" },
      { key: "status", label: "Status" },
    ],
  },
  suppliers: {
    badge: "Operations / Suppliers",
    title: "Suppliers",
    description:
      "Kelola supplier, lead time, status kontrak, dan performa procurement.",
    icon: PackageCheck,
    columns: [
      { key: "name", label: "Supplier" },
      { key: "category", label: "Category" },
      { key: "leadTime", label: "Lead Time" },
      { key: "status", label: "Status" },
    ],
  },
};