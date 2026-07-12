import { api } from "@/lib/api";
import { isEndpointFallbackError } from "@/lib/api-error";
import { getCurrentCompanyId, isCurrentUserSuperAdmin } from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";
import type { ModuleData, ModuleRow } from "@/types/modules";
import type { ProductModuleKey } from "./types";
import { productDummyData } from "./dummy";

const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY_API === "true";

type GetProductModuleDataInput =
  | ProductModuleKey
  | {
      moduleKey: ProductModuleKey;
      companyId?: string;
    };

type BackendListResponse<T> = {
  data?: T[];
  items?: T[];
  results?: T[];
  rows?: T[];
  products?: T[];
  categories?: T[];
  stocks?: T[];
  suppliers?: T[];
  branches?: T[];
};

type BackendBranch = {
  id: string;
  company_id?: string | null;

  name?: string | null;
  branch_name?: string | null;
  branch_label?: string | null;
  branch_code?: string | null;
  company_branch_name?: string | null;
  warehouse_name?: string | null;
  outlet_name?: string | null;
  store_name?: string | null;
  location_name?: string | null;
  code?: string | null;
};

type BackendProduct = {
  id: string;
  company_id?: string;
  branch_id?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  created_by_id?: string | null;

  sku?: string | null;
  barcode?: string | null;
  name?: string | null;
  description?: string | null;

  product_type?: string | null;
  unit?: string | null;

  cost_price?: number | string | null;
  selling_price?: number | string | null;

  track_stock?: boolean | string | null;
  status?: string | null;

  image_url?: string | null;
  photo_url?: string | null;
};

type BackendProductCategory = {
  id: string;
  company_id?: string;
  parent_category_id?: string | null;

  code?: string | null;
  name?: string | null;
  description?: string | null;

  is_active?: boolean | string | null;
};

type BackendProductStock = {
  id: string;
  company_id?: string | null;
  product_id: string;
  branch_id: string;

  quantity_on_hand?: number | string | null;
  reserved_quantity?: number | string | null;
  reorder_point?: number | string | null;

  product_name?: string | null;
  product_sku?: string | null;

  branch_name?: string | null;
  branch_label?: string | null;
  branch_code?: string | null;
  company_branch_name?: string | null;
  warehouse_name?: string | null;
  outlet_name?: string | null;
  store_name?: string | null;
  location_name?: string | null;

  product?: Partial<BackendProduct> | null;
  branch?: BackendBranch | null;

  updated_at?: string | null;
};

type BackendProductSupplier = {
  id: string;
  company_id?: string | null;

  name?: string | null;
  category?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  lead_time_days?: number | string | null;
  status?: string | null;
};

type ProductBundle = {
  products: BackendProduct[];
  categories: BackendProductCategory[];
  stocks: BackendProductStock[];
  suppliers: BackendProductSupplier[];
  branches: BackendBranch[];
};

function resolveInput(input: GetProductModuleDataInput) {
  if (typeof input === "string") {
    return {
      moduleKey: input,
      companyId: undefined,
    };
  }

  return input;
}

function isValidUuid(value: string | undefined | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isUuidText(value: unknown) {
  const text = String(value ?? "").trim();

  return isValidUuid(text);
}

/**
 * Ambil text display yang bukan UUID.
 * Ini penting supaya kolom Branch tidak pernah menampilkan branch_id.
 */
function pickDisplayText(values: unknown[], fallback = "-") {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (!text) continue;
    if (isUuidText(text)) continue;

    return text;
  }

  return fallback;
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string => Boolean(value && isValidUuid(value))
      )
    )
  );
}

function getActiveCompanyId(companyIdOverride?: string) {
  if (
    companyIdOverride &&
    companyIdOverride !== "all" &&
    isValidUuid(companyIdOverride)
  ) {
    return companyIdOverride;
  }

  const currentCompanyId = getCurrentCompanyId();

  if (
    currentCompanyId &&
    isValidUuid(currentCompanyId) &&
    !isCurrentUserSuperAdmin()
  ) {
    return currentCompanyId;
  }

  const selectedCompanyId = getSelectedCompanyId();

  if (
    selectedCompanyId &&
    selectedCompanyId !== "all" &&
    isValidUuid(selectedCompanyId)
  ) {
    return selectedCompanyId;
  }

  return null;
}

function withCompanyParams(
  companyId?: string | null,
  params: Record<string, unknown> = {}
) {
  if (!companyId) return params;

  return {
    ...params,
    company_id: companyId,
  };
}

function rowsFrom<T>(response: BackendListResponse<T> | T[] | unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (!response || typeof response !== "object") return [];

  const record = response as Record<string, unknown>;

  const keys = [
    "data",
    "items",
    "results",
    "rows",
    "products",
    "categories",
    "stocks",
    "suppliers",
    "branches",
  ];

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as T[];
    }

    // Penting: handle response nested seperti:
    // { data: { items: [...] } }
    // { data: { data: [...] } }
    if (value && typeof value === "object") {
      const nestedRows = rowsFrom<T>(value);

      if (nestedRows.length > 0) {
        return nestedRows;
      }
    }
  }

  return [];
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value)
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(" ", "")
    .replace(/[^\d.,-]/g, "");

  if (!raw) return 0;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  let normalized = raw;

  if (hasComma && hasDot) {
    const lastCommaIndex = raw.lastIndexOf(",");
    const lastDotIndex = raw.lastIndexOf(".");

    if (lastCommaIndex > lastDotIndex) {
      normalized = raw.replaceAll(".", "").replace(",", ".");
    } else {
      normalized = raw.replaceAll(",", "");
    }
  } else if (hasComma) {
    normalized = raw.replace(",", ".");
  }

  const number = Number(normalized);

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

function formatBooleanStatus(value: unknown) {
  if (value === false || value === "false") return "Inactive";

  return "Active";
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

function sumStockValue(
  stocks: BackendProductStock[],
  field: keyof BackendProductStock
) {
  return stocks.reduce((total, stock) => total + toNumber(stock[field]), 0);
}

async function fetchRows<T>(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  try {
    const response = await api.get<BackendListResponse<T> | T[]>(endpoint, {
      params,
    });

    return rowsFrom<T>(response.data);
  } catch (error) {
    if (!isEndpointFallbackError(error)) {
      throw error;
    }
    return [];
  }
}

async function fetchFirstAvailableRows<T>(
  candidates: Array<{
    endpoint: string;
    params?: Record<string, unknown>;
  }>
) {
  for (const candidate of candidates) {
    const rows = await fetchRows<T>(candidate.endpoint, candidate.params);

    if (rows.length > 0) return rows;
  }

  return [];
}

async function fetchBranches(companyId?: string | null) {
  if (companyId && isValidUuid(companyId)) {
    return fetchFirstAvailableRows<BackendBranch>([
      {
        endpoint: `/api/v1/companies/${companyId}/branches`,
      },
      {
        endpoint: "/api/v1/branches",
        params: {
          company_id: companyId,
          limit: 100,
        },
      },
      {
        endpoint: "/api/v1/company/branches",
        params: {
          company_id: companyId,
          limit: 100,
        },
      },
      {
        endpoint: "/api/v1/admin/branches",
        params: {
          company_id: companyId,
          limit: 100,
        },
      },
    ]);
  }

  return fetchFirstAvailableRows<BackendBranch>([
    {
      endpoint: "/api/v1/branches",
      params: {
        limit: 100,
      },
    },
    {
      endpoint: "/api/v1/admin/branches",
      params: {
        limit: 100,
      },
    },
  ]);
}

async function fetchBranchesForBundle({
  activeCompanyId,
  products,
  stocks,
  suppliers,
}: {
  activeCompanyId?: string | null;
  products: BackendProduct[];
  stocks: BackendProductStock[];
  suppliers: BackendProductSupplier[];
}) {
  if (activeCompanyId && isValidUuid(activeCompanyId)) {
    return fetchBranches(activeCompanyId);
  }

  const companyIds = uniqueStrings([
    ...products.map((product) => product.company_id),
    ...stocks.map((stock) => stock.company_id),
    ...suppliers.map((supplier) => supplier.company_id),
  ]);

  if (companyIds.length === 0) {
    return fetchBranches(null);
  }

  const branchGroups = await Promise.all(
    companyIds.map((companyId) => fetchBranches(companyId))
  );

  return uniqueBy(branchGroups.flat(), (branch) => branch.id);
}

async function fetchProductBundle(companyId?: string): Promise<ProductBundle> {
  const activeCompanyId = getActiveCompanyId(companyId);

  const baseParams = withCompanyParams(activeCompanyId, {
    limit: 100,
  });

  const [products, categories, stocks, suppliers] = await Promise.all([
    fetchRows<BackendProduct>("/api/v1/products/items", {
      ...baseParams,
      sort_by: "name",
      sort_order: "asc",
    }),

    fetchRows<BackendProductCategory>("/api/v1/products/categories", {
      ...baseParams,
      sort_by: "name",
      sort_order: "asc",
    }),

    fetchRows<BackendProductStock>("/api/v1/products/stocks", {
      ...baseParams,
      sort_by: "updated_at",
      sort_order: "desc",
    }),

    fetchRows<BackendProductSupplier>("/api/v1/products/suppliers", {
      ...baseParams,
      sort_by: "name",
      sort_order: "asc",
    }),
  ]);

  const uniqueProducts = uniqueBy(
    products,
    (product) => product.id || product.sku
  );

  const uniqueCategories = uniqueBy(
    categories,
    (category) => category.id || category.code
  );

  const uniqueStocks = uniqueBy(
    stocks,
    (stock) => stock.id || `${stock.product_id}-${stock.branch_id}`
  );

  const uniqueSuppliers = uniqueBy(
    suppliers,
    (supplier) => supplier.id || supplier.email || supplier.name
  );

  const branches = await fetchBranchesForBundle({
    activeCompanyId,
    products: uniqueProducts,
    stocks: uniqueStocks,
    suppliers: uniqueSuppliers,
  });

  return {
    products: uniqueProducts,
    categories: uniqueCategories,
    stocks: uniqueStocks,
    suppliers: uniqueSuppliers,
    branches: uniqueBy(branches, (branch) => branch.id),
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

function getBranchName(branch?: BackendBranch | null) {
  if (!branch) return "";

  return pickDisplayText(
    [
      branch.name,
      branch.branch_name,
      branch.branch_label,
      branch.branch_code,
      branch.company_branch_name,
      branch.warehouse_name,
      branch.outlet_name,
      branch.store_name,
      branch.location_name,
      branch.code,
    ],
    ""
  );
}

function makeOverviewRows(bundle: ProductBundle): ModuleRow[] {
  const categoryMap = new Map(
    bundle.categories.map((category) => [category.id, category])
  );

  const supplierMap = new Map(
    bundle.suppliers.map((supplier) => [supplier.id, supplier])
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

    const supplierName = product.supplier_id
      ? supplierMap.get(product.supplier_id)?.name ?? "-"
      : "-";

    return {
      id: String(product.id),
      company_id: String(product.company_id ?? ""),
      branch_id: String(product.branch_id ?? ""),
      category_id: String(product.category_id ?? ""),
      supplier_id: String(product.supplier_id ?? ""),

      photo: String(product.image_url || product.photo_url || makeInitial(product.name)),
      image_url: String(product.image_url || product.photo_url || ""),

      name: String(product.name ?? "-"),
      sku: String(product.sku ?? "-"),
      barcode: String(product.barcode ?? ""),
      description: String(product.description ?? ""),

      category: String(categoryName),
      supplier: String(supplierName),

      stock: String(stock),
      reserved: String(reserved),
      reorder: String(reorder),

      quantity_on_hand: String(stock),
      reserved_quantity: String(reserved),
      reorder_point: String(reorder),

      unit: String(product.unit ?? "pcs"),
      price: formatRupiah(product.selling_price),
      cost_price: String(product.cost_price ?? ""),
      selling_price: String(product.selling_price ?? ""),

      product_type: String(product.product_type ?? "physical"),
      track_stock: String(product.track_stock ?? true),

      status: formatStatus(product.status),
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
      company_id: String(category.company_id ?? ""),
      parent_category_id: String(category.parent_category_id ?? ""),

      code: String(category.code ?? "-"),
      name: String(category.name ?? "-"),
      description: String(category.description ?? ""),

      products: String(products.length),
      revenue: "-",

      is_active: String(category.is_active ?? true),
      status: formatBooleanStatus(category.is_active),
    };
  });
}

function makeStockRows(bundle: ProductBundle): ModuleRow[] {
  const productMap = new Map(
    bundle.products.map((product) => [product.id, product])
  );

  const branchMap = new Map(
    bundle.branches.map((branch) => [branch.id, branch])
  );

  return bundle.stocks.map((stock) => {
    const product = productMap.get(stock.product_id) || stock.product || null;
    const branch = branchMap.get(stock.branch_id) || stock.branch || null;

    const quantity = toNumber(stock.quantity_on_hand);
    const reserved = toNumber(stock.reserved_quantity);
    const reorder = toNumber(stock.reorder_point);

    const productName = pickDisplayText(
      [stock.product_name, product?.name],
      "Product belum ditemukan"
    );

    const productSku = pickDisplayText([stock.product_sku, product?.sku], "-");

    const branchName = pickDisplayText(
      [
        stock.branch_name,
        stock.branch_label,
        stock.branch_code,
        stock.company_branch_name,
        stock.warehouse_name,
        stock.outlet_name,
        stock.store_name,
        stock.location_name,
        getBranchName(branch),
      ],
      "Branch belum ditemukan"
    );

    return {
      id: String(stock.id),

      company_id: String(stock.company_id || product?.company_id || ""),
      product_id: String(stock.product_id ?? ""),
      branch_id: String(stock.branch_id ?? ""),

      product: String(productName),
      sku: String(productSku),

      /**
       * PENTING:
       * Jangan fallback ke stock.branch_id di field display.
       * Kalau nama branch tidak ketemu, tampilkan fallback non-UUID.
       */
      branch: String(branchName),

      stock: String(quantity),
      reserved: String(reserved),
      reorder: String(reorder),

      quantity_on_hand: String(quantity),
      reserved_quantity: String(reserved),
      reorder_point: String(reorder),

      status: quantity <= reorder ? "Low Stock" : "Ready",
    };
  });
}

function makeSupplierRows(bundle: ProductBundle): ModuleRow[] {
  return bundle.suppliers.map((supplier) => {
    const leadTime = toNumber(supplier.lead_time_days);

    return {
      id: String(supplier.id),
      company_id: String(supplier.company_id ?? ""),

      name: String(supplier.name ?? "-"),
      category: String(supplier.category ?? ""),
      contact_person: String(supplier.contact_person ?? ""),
      email: String(supplier.email ?? ""),
      phone: String(supplier.phone ?? ""),
      address: String(supplier.address ?? ""),

      leadTime: leadTime > 0 ? `${leadTime} days` : "-",
      lead_time_days: String(leadTime),

      status: formatStatus(supplier.status ?? "active"),
    };
  });
}

function getLowStockCount(bundle: ProductBundle) {
  return bundle.stocks.filter((stock) => {
    const quantity = toNumber(stock.quantity_on_hand);
    const reorder = toNumber(stock.reorder_point);

    return quantity <= reorder;
  }).length;
}

function getTotalStock(bundle: ProductBundle) {
  return bundle.stocks.reduce(
    (total, stock) => total + toNumber(stock.quantity_on_hand),
    0
  );
}

function makeProductMetrics(bundle: ProductBundle) {
  return [
    {
      label: "Active SKU",
      value: String(bundle.products.length),
      helper: "Data dari /products/items",
    },
    {
      label: "Total Stock",
      value: String(getTotalStock(bundle)),
      helper: "Data dari /products/stocks",
    },
    {
      label: "Low Stock",
      value: String(getLowStockCount(bundle)),
      helper: "Stock <= reorder point",
    },
  ];
}

function makeOverviewModuleData(
  rows: ModuleRow[],
  bundle: ProductBundle
): ModuleData {
  return {
    metrics: makeProductMetrics(bundle),
    rows,
    aiNotes: [
      "Product, category, supplier, dan stock di-fetch dari endpoint backend asli.",
      "Category dicocokkan dari category_id ke /products/categories.",
      "Stock dicocokkan dari /products/stocks berdasarkan product_id.",
    ],
  };
}

function makeCategoryModuleData(bundle: ProductBundle): ModuleData {
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
        value: String(
          bundle.products.filter((product) => product.category_id).length
        ),
        helper: "Produk yang sudah punya category_id",
      },
      {
        label: "Unmapped Products",
        value: String(
          bundle.products.filter((product) => !product.category_id).length
        ),
        helper: "Produk tanpa category_id",
      },
    ],
    rows,
    aiNotes: [
      "Category sekarang diambil dari backend.",
      "Jumlah product per kategori dihitung dari relasi category_id.",
    ],
  };
}

function makeStockModuleData(bundle: ProductBundle): ModuleData {
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
        value: String(getTotalStock(bundle)),
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
      "Stock tidak disimpan langsung di tabel product.",
      "Stock diambil dari /products/stocks.",
      "Branch UUID tidak ditampilkan di tabel; jika nama branch gagal ditemukan, tampil Branch belum ditemukan.",
    ],
  };
}

function makeSupplierModuleData(bundle: ProductBundle): ModuleData {
  const rows = makeSupplierRows(bundle);

  return {
    metrics: [
      {
        label: "Suppliers",
        value: String(rows.length),
        helper: "Data dari /products/suppliers",
      },
      {
        label: "Active",
        value: String(
          rows.filter((row) => String(row.status).toLowerCase() === "active")
            .length
        ),
        helper: "Supplier aktif",
      },
      {
        label: "Review",
        value: String(
          rows.filter((row) => String(row.status).toLowerCase() === "review")
            .length
        ),
        helper: "Supplier yang perlu direview",
      },
    ],
    rows,
    aiNotes: [
      "Supplier di-fetch dari backend.",
      "Field category supplier tetap dikirim sebagai string, bukan readonly.",
    ],
  };
}

export async function getProductModuleData(
  input: GetProductModuleDataInput
): Promise<ModuleData> {
  const { moduleKey, companyId } = resolveInput(input);

  if (USE_DUMMY) {
    return productDummyData[moduleKey];
  }

  const bundle = await fetchProductBundle(companyId);

  if (moduleKey === "categories") {
    return makeCategoryModuleData(bundle);
  }

  if (moduleKey === "stock") {
    return makeStockModuleData(bundle);
  }

  if (moduleKey === "suppliers") {
    return makeSupplierModuleData(bundle);
  }

  const rows = makeOverviewRows(bundle);
  return makeOverviewModuleData(rows, bundle);
}