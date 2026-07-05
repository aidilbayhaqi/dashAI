import { api } from "@/lib/api";
import type { ModuleData, ModuleRow } from "@/types/modules";
import type { ProductModuleKey } from "./types";
import { productDummyData } from "./dummy";

const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY_API === "true";

type BackendPaginatedResponse<T> = {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    total_pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
};

type BackendProduct = {
  id: string;
  company_id?: string;
  branch_id?: string | null;
  category_id?: string | null;
  created_by_id?: string | null;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  product_type?: string;
  unit?: string;
  cost_price?: number | string;
  selling_price?: number | string;
  track_stock?: boolean;
  status?: string;
  image_url?: string | null;
  photo_url?: string | null;
};

type BackendProductCategory = {
  id: string;
  company_id?: string;
  parent_category_id?: string | null;
  code?: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
};

type BackendProductStock = {
  id: string;
  product_id: string;
  branch_id: string;
  quantity_on_hand?: number | string;
  reserved_quantity?: number | string;
  reorder_point?: number | string;
  updated_at?: string;
};

type ProductBundle = {
  products: BackendProduct[];
  categories: BackendProductCategory[];
  stocks: BackendProductStock[];
};

function rowsFrom<T>(response: BackendPaginatedResponse<T> | T[]): T[] {
  return Array.isArray(response) ? response : response.data ?? [];
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatRupiah(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
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

function uniqueBy<T>(rows: T[], getKey: (row: T) => string | undefined | null) {
  const map = new Map<string, T>();

  rows.forEach((row, index) => {
    const key = getKey(row) || String(index);
    map.set(key, row);
  });

  return Array.from(map.values());
}

function sumStockValue(stocks: BackendProductStock[], field: keyof BackendProductStock) {
  return stocks.reduce((total, stock) => total + toNumber(stock[field]), 0);
}

async function fetchProductBundle(): Promise<ProductBundle> {
  const [productsResponse, categoriesResponse, stocksResponse] = await Promise.all([
    api.get<BackendPaginatedResponse<BackendProduct> | BackendProduct[]>(
      "/api/v1/products/items",
      {
        params: {
          limit: 100,
        },
      }
    ),

    api.get<BackendPaginatedResponse<BackendProductCategory> | BackendProductCategory[]>(
      "/api/v1/products/categories",
      {
        params: {
          limit: 100,
        },
      }
    ),

    api.get<BackendPaginatedResponse<BackendProductStock> | BackendProductStock[]>(
      "/api/v1/products/stocks",
      {
        params: {
          limit: 100,
        },
      }
    ),
  ]);

  return {
    products: uniqueBy(
      rowsFrom(productsResponse.data),
      (product) => product.id || product.sku
    ),
    categories: uniqueBy(
      rowsFrom(categoriesResponse.data),
      (category) => category.id || category.code
    ),
    stocks: uniqueBy(
      rowsFrom(stocksResponse.data),
      (stock) => `${stock.product_id}-${stock.branch_id}`
    ),
  };
}

function groupStocksByProduct(stocks: BackendProductStock[]) {
  const map = new Map<string, BackendProductStock[]>();

  stocks.forEach((stock) => {
    const current = map.get(stock.product_id) ?? [];
    current.push(stock);
    map.set(stock.product_id, current);
  });

  return map;
}

function makeOverviewRows(bundle: ProductBundle): ModuleRow[] {
  const categoryMap = new Map(
    bundle.categories.map((category) => [category.id, category])
  );

  const stockMap = groupStocksByProduct(bundle.stocks);

  return bundle.products.map((product) => {
    const productStocks = stockMap.get(product.id) ?? [];

    const stock = sumStockValue(productStocks, "quantity_on_hand");
    const reserved = sumStockValue(productStocks, "reserved_quantity");
    const reorder = sumStockValue(productStocks, "reorder_point");

    const categoryName = product.category_id
      ? categoryMap.get(product.category_id)?.name ?? "-"
      : "-";

    const status =
      product.track_stock && stock <= reorder
        ? "Low Stock"
        : formatStatus(product.status);

    return {
      id: String(product.id),
      photo: String(product.image_url || product.photo_url || makeInitial(product.name)),
      name: String(product.name ?? "-"),
      sku: String(product.sku ?? "-"),
      category: String(categoryName),
      stock: String(stock),
      reserved: String(reserved),
      reorder: String(reorder),
      unit: String(product.unit ?? "pcs"),
      price: formatRupiah(product.selling_price),
      status,
    };
  });
}

function makeCategoryRows(bundle: ProductBundle): ModuleRow[] {
  return bundle.categories.map((category) => {
    const products = bundle.products.filter(
      (product) => product.category_id === category.id
    );

    return {
      id: String(category.id),
      name: String(category.name ?? "-"),
      code: String(category.code ?? "-"),
      products: String(products.length),
      revenue: "-",
      status: category.is_active === false ? "Inactive" : "Active",
    };
  });
}

function makeStockRows(bundle: ProductBundle): ModuleRow[] {
  const productMap = new Map(
    bundle.products.map((product) => [product.id, product])
  );

  return bundle.stocks.map((stock) => {
    const product = productMap.get(stock.product_id);

    const quantity = toNumber(stock.quantity_on_hand);
    const reserved = toNumber(stock.reserved_quantity);
    const reorder = toNumber(stock.reorder_point);

    return {
      id: String(stock.id),
      product: String(product?.name ?? stock.product_id),
      sku: String(product?.sku ?? "-"),
      branch: String(stock.branch_id),
      stock: String(quantity),
      reserved: String(reserved),
      reorder: String(reorder),
      status: quantity <= reorder ? "Low Stock" : "Ready",
    };
  });
}

function makeProductMetrics(bundle: ProductBundle, rows: ModuleRow[]) {
  const lowStockCount = rows.filter((row) => row.status === "Low Stock").length;

  const totalStock = bundle.stocks.reduce(
    (total, stock) => total + toNumber(stock.quantity_on_hand),
    0
  );

  return [
    {
      label: "Active SKU",
      value: String(bundle.products.length),
      helper: "Data dari /products/items",
    },
    {
      label: "Total Stock",
      value: String(totalStock),
      helper: "Data dari /products/stocks",
    },
    {
      label: "Low Stock",
      value: String(lowStockCount),
      helper: "Stock <= reorder point",
    },
  ];
}

function makeModuleData(rows: ModuleRow[], bundle: ProductBundle): ModuleData {
  return {
    metrics: makeProductMetrics(bundle, rows),
    rows,
    aiNotes: [
      "Product, category, dan stock sekarang di-fetch dari endpoint backend asli.",
      "Category diambil dari category_id lalu dicocokkan ke /products/categories.",
      "Stock diambil dari /products/stocks berdasarkan product_id.",
    ],
  };
}

export async function getProductModuleData(
  moduleKey: ProductModuleKey
): Promise<ModuleData> {
  if (USE_DUMMY) {
    return productDummyData[moduleKey];
  }

  if (moduleKey === "suppliers") {
    return productDummyData.suppliers;
  }

  const bundle = await fetchProductBundle();

  if (moduleKey === "categories") {
    const rows = makeCategoryRows(bundle);

    return {
      metrics: [
        {
          label: "Categories",
          value: String(rows.length),
          helper: "Data dari /products/categories",
        },
        {
          label: "Mapped Products",
          value: String(bundle.products.filter((product) => product.category_id).length),
          helper: "Produk yang sudah punya category_id",
        },
        {
          label: "Unmapped Products",
          value: String(bundle.products.filter((product) => !product.category_id).length),
          helper: "Produk tanpa category_id",
        },
      ],
      rows,
      aiNotes: [
        "Category sekarang bukan dummy lagi.",
        "Jumlah product per kategori dihitung dari relasi category_id.",
      ],
    };
  }

  if (moduleKey === "stock") {
    const rows = makeStockRows(bundle);

    return {
      metrics: [
        {
          label: "Stock Records",
          value: String(rows.length),
          helper: "Data dari /products/stocks",
        },
        {
          label: "Total Stock",
          value: String(
            bundle.stocks.reduce(
              (total, stock) => total + toNumber(stock.quantity_on_hand),
              0
            )
          ),
          helper: "Akumulasi quantity_on_hand",
        },
        {
          label: "Low Stock",
          value: String(rows.filter((row) => row.status === "Low Stock").length),
          helper: "Stock <= reorder point",
        },
      ],
      rows,
      aiNotes: [
        "Stock tidak ada langsung di tabel product.",
        "Stock diambil dari /products/stocks lalu nama produk dicocokkan dari product_id.",
      ],
    };
  }

  const rows = makeOverviewRows(bundle);
  return makeModuleData(rows, bundle);
}