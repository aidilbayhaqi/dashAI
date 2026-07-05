import { Package, PackageCheck, Tags, Warehouse } from "lucide-react";
import type { ModuleConfig, ModuleField } from "@/types/modules";
import type { ProductModuleKey } from "./types";

const productItemFormFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  {
    key: "branch_id",
    label: "Branch",
    type: "select",
  },

  { key: "sku", label: "SKU", required: true },
  { key: "barcode", label: "Barcode" },
  { key: "name", label: "Product Name", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "image_url", label: "Product Image", type: "file" },

  {
    key: "product_type",
    label: "Product Type",
    type: "select",
    required: true,
    options: [
      { label: "Physical", value: "physical" },
      { label: "Digital", value: "digital" },
      { label: "Service", value: "service" },
    ],
  },

  { key: "unit", label: "Unit", required: true },
  { key: "cost_price", label: "Cost Price", type: "number" },
  { key: "selling_price", label: "Selling Price", type: "number" },

  {
    key: "track_stock",
    label: "Track Stock",
    type: "select",
    options: [
      { label: "True", value: "true" },
      { label: "False", value: "false" },
    ],
  },

  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Archived", value: "archived" },
    ],
  },
];

const productCategoryFormFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  { key: "parent_category_id", label: "Parent Category ID" },
  { key: "code", label: "Code", required: true },
  { key: "name", label: "Category Name", required: true },
  { key: "description", label: "Description", type: "textarea" },
  {
    key: "is_active",
    label: "Is Active",
    type: "select",
    options: [
      { label: "True", value: "true" },
      { label: "False", value: "false" },
    ],
  },
];

const productStockFormFields: ModuleField[] = [
  { key: "company_id", label: "Company ID" },
  { key: "product_id", label: "Product ID", required: true },
  { key: "branch_id", label: "Branch ID", required: true },
  { key: "quantity_on_hand", label: "Quantity On Hand", type: "number" },
  { key: "reserved_quantity", label: "Reserved Quantity", type: "number" },
  { key: "reorder_point", label: "Reorder Point", type: "number" },
];

const productSupplierFormFields: ModuleField[] = [
  { key: "company_id", label: "Company ID" },
  { key: "name", label: "Supplier Name", required: true },
  { key: "category", label: "Category" },
  { key: "contact_person", label: "Contact Person" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "lead_time_days", label: "Lead Time Days", type: "number" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Review", value: "review" },
    ],
  },
];

export const productModuleConfig: Record<ProductModuleKey, ModuleConfig> = {
  overview: {
    badge: "Operations / Inventory",
    title: "Product Management",
    description:
      "Kelola produk, SKU, kategori, stok, supplier, harga, dan performa inventory.",
    icon: Package,
    columns: [
      { key: "photo", label: "Photo" },
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Stock" },
      { key: "price", label: "Price" },
      { key: "status", label: "Status" },
    ],
    formFields: productItemFormFields,
    detailFields: [
      { key: "photo", label: "Photo" },
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Stock" },
      { key: "price", label: "Price" },
      { key: "status", label: "Status" },
      { key: "product_type", label: "Product Type" },
      { key: "unit", label: "Unit" },
      { key: "cost_price", label: "Cost Price" },
      { key: "selling_price", label: "Selling Price" },
      { key: "track_stock", label: "Track Stock" },
      { key: "description", label: "Description" },
      { key: "image_url", label: "Image URL" },
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
    formFields: productCategoryFormFields,
    detailFields: [
      { key: "code", label: "Code" },
      { key: "name", label: "Category" },
      { key: "products", label: "Products" },
      { key: "revenue", label: "Revenue" },
      { key: "description", label: "Description" },
      { key: "is_active", label: "Active" },
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
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "branch", label: "Branch" },
      { key: "stock", label: "Stock" },
      { key: "reserved", label: "Reserved" },
      { key: "reorder", label: "Reorder Point" },
      { key: "status", label: "Status" },
    ],
    formFields: productStockFormFields,
    detailFields: [
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "branch", label: "Branch" },
      { key: "stock", label: "Stock" },
      { key: "reserved", label: "Reserved" },
      { key: "reorder", label: "Reorder Point" },
      { key: "status", label: "Status" },
      { key: "product_id", label: "Product ID" },
      { key: "branch_id", label: "Branch ID" },
      { key: "quantity_on_hand", label: "Quantity On Hand" },
      { key: "reserved_quantity", label: "Reserved Quantity" },
      { key: "reorder_point", label: "Reorder Point" },
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
    formFields: productSupplierFormFields,
    detailFields: [
      { key: "name", label: "Supplier" },
      { key: "category", label: "Category" },
      { key: "contact_person", label: "Contact Person" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "leadTime", label: "Lead Time" },
      { key: "lead_time_days", label: "Lead Time Days" },
      { key: "status", label: "Status" },
    ],
  },
};