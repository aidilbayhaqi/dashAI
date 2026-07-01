import type { ModuleData } from "@/types/modules";
import type { ProductModuleKey } from "./types";

export const productDummyData: Record<ProductModuleKey, ModuleData> = {
  overview: {
    metrics: [
      {
        label: "Active SKU",
        value: "342",
        helper: "24 SKU butuh perhatian stok",
        trend: "+8.4%",
      },
      {
        label: "Stock Value",
        value: "Rp 4.8 M",
        helper: "Estimasi nilai inventory aktif",
      },
      {
        label: "Low Stock",
        value: "18",
        helper: "Item masuk reorder threshold",
      },
    ],
    rows: [
      {
        name: "ERP Premium License",
        sku: "ERP-001",
        stock: "84",
        price: "Rp 2.500.000",
        status: "Active",
      },
      {
        name: "AI Agent Add-on",
        sku: "AI-022",
        stock: "24",
        price: "Rp 1.800.000",
        status: "Active",
      },
      {
        name: "Inventory Scanner",
        sku: "INV-310",
        stock: "6",
        price: "Rp 850.000",
        status: "Low Stock",
      },
    ],
    aiNotes: [
      "Produk AI Agent memiliki growth tertinggi dan cocok diprioritaskan di campaign berikutnya.",
      "Inventory Scanner sudah masuk zona low stock, rekomendasi reorder minggu ini.",
      "SKU dengan margin tinggi bisa dipaketkan dengan ERP Premium License.",
    ],
  },

  categories: {
    metrics: [
      {
        label: "Categories",
        value: "18",
        helper: "Kategori aktif",
      },
      {
        label: "Top Category",
        value: "Software",
        helper: "Kontribusi revenue tertinggi",
      },
      {
        label: "Unmapped SKU",
        value: "7",
        helper: "Produk belum punya kategori",
      },
    ],
    rows: [
      {
        name: "Software",
        products: "122",
        revenue: "Rp 8.2 M",
        status: "Active",
      },
      {
        name: "Hardware",
        products: "74",
        revenue: "Rp 2.1 M",
        status: "Active",
      },
      {
        name: "Services",
        products: "43",
        revenue: "Rp 4.7 M",
        status: "Review",
      },
    ],
    aiNotes: [
      "Kategori Software mendominasi revenue dan cocok dibuatkan paket bundling.",
      "Beberapa SKU belum dipetakan kategori sehingga reporting belum sepenuhnya akurat.",
    ],
  },

  stock: {
    metrics: [
      {
        label: "Total Stock",
        value: "12,840",
        helper: "Across all warehouses",
      },
      {
        label: "Reorder Needed",
        value: "18",
        helper: "Below minimum threshold",
      },
      {
        label: "Warehouse",
        value: "4",
        helper: "Active storage locations",
      },
    ],
    rows: [
      {
        item: "Inventory Scanner",
        warehouse: "Jakarta",
        stock: "6",
        minimum: "15",
        status: "Low Stock",
      },
      {
        item: "POS Terminal",
        warehouse: "Bandung",
        stock: "21",
        minimum: "10",
        status: "Active",
      },
      {
        item: "Barcode Label",
        warehouse: "Jakarta",
        stock: "240",
        minimum: "100",
        status: "Active",
      },
    ],
    aiNotes: [
      "Inventory Scanner perlu reorder segera untuk menghindari lost sales.",
      "Warehouse Jakarta memiliki movement tertinggi dalam 30 hari terakhir.",
    ],
  },

  suppliers: {
    metrics: [
      {
        label: "Suppliers",
        value: "26",
        helper: "Vendor aktif",
      },
      {
        label: "Avg Lead Time",
        value: "5.2 Days",
        helper: "Rata-rata pengiriman",
      },
      {
        label: "Pending PO",
        value: "9",
        helper: "Purchase order aktif",
      },
    ],
    rows: [
      {
        name: "PT Sumber Digital",
        category: "Software",
        leadTime: "2 days",
        status: "Active",
      },
      {
        name: "CV Prima Hardware",
        category: "Hardware",
        leadTime: "6 days",
        status: "Review",
      },
      {
        name: "Nusantara Service",
        category: "Services",
        leadTime: "4 days",
        status: "Active",
      },
    ],
    aiNotes: [
      "Supplier hardware memiliki lead time lebih panjang, perlu buffer stock tambahan.",
      "Vendor software punya performa stabil dan bisa dijadikan partner prioritas.",
    ],
  },
};