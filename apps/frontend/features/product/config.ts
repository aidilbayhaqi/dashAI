import { Package, PackageCheck, Tags, Warehouse } from "lucide-react";

import type { ModuleConfig, ModuleField } from "@/types/modules";
import type { ProductModuleKey } from "./types";

const companyBranchFields: ModuleField[] = [
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
];

const productItemFormFields: ModuleField[] = [
  ...companyBranchFields,

  {
    key: "category_id",
    label: "Category",
    type: "select",
  },
  {
    key: "supplier_id",
    label: "Supplier",
    type: "select",
  },

  {
    key: "sku",
    label: "SKU",
    placeholder: "SKU-001",
    required: true,
  },
  {
    key: "barcode",
    label: "Barcode",
    placeholder: "899xxxx",
  },
  {
    key: "name",
    label: "Product Name",
    placeholder: "Nama produk",
    required: true,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
  },
  {
    key: "image_url",
    label: "Product Image",
    type: "file",
  },

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

  {
    key: "unit",
    label: "Unit",
    placeholder: "pcs / box / kg",
    required: true,
  },
  {
    key: "cost_price",
    label: "Cost Price",
    type: "number",
  },
  {
    key: "selling_price",
    label: "Selling Price",
    type: "number",
  },

  {
    key: "track_stock",
    label: "Track Stock",
    type: "select",
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
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
  {
    key: "parent_category_id",
    label: "Parent Category",
    type: "select",
  },
  {
    key: "code",
    label: "Code",
    placeholder: "CAT-001",
    required: true,
  },
  {
    key: "name",
    label: "Category Name",
    placeholder: "Elektronik / Fashion / Food",
    required: true,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
  },
  {
    key: "is_active",
    label: "Active",
    type: "select",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

const productStockFormFields: ModuleField[] = [
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
    required: true,
  },
  {
    key: "product_id",
    label: "Product",
    type: "select",
    required: true,
  },
  {
    key: "quantity_on_hand",
    label: "Quantity On Hand",
    type: "number",
    required: true,
  },
  {
    key: "reserved_quantity",
    label: "Reserved Quantity",
    type: "number",
  },
  {
    key: "reorder_point",
    label: "Reorder Point",
    type: "number",
  },
];

const productSupplierFormFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  {
    key: "name",
    label: "Supplier Name",
    placeholder: "Nama supplier",
    required: true,
  },
  {
    key: "category",
    label: "Category",
    placeholder: "Raw Material / Vendor / Distributor",
  },
  {
    key: "contact_person",
    label: "Contact Person",
    placeholder: "Nama PIC",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
  },
  {
    key: "phone",
    label: "Phone",
    placeholder: "+62-812-xxxx",
  },
  {
    key: "address",
    label: "Address",
    type: "textarea",
  },
  {
    key: "lead_time_days",
    label: "Lead Time Days",
    type: "number",
  },
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
      "Kelola produk, SKU, kategori, supplier, satuan, harga, dan performa inventory.",
    icon: Package,
    columns: [
      { key: "photo", label: "Photo" },
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
      { key: "price", label: "Price" },
      { key: "status", label: "Status" },
    ],
    formFields: productItemFormFields,
    detailFields: [
      { key: "photo", label: "Photo" },
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "barcode", label: "Barcode" },
      { key: "category", label: "Category" },
      { key: "supplier", label: "Supplier" },
      { key: "unit", label: "Unit" },
      { key: "price", label: "Price" },
      { key: "status", label: "Status" },
      { key: "product_type", label: "Product Type" },
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
      { key: "code", label: "Code" },
      { key: "name", label: "Category" },
      { key: "products", label: "Products" },
      { key: "revenue", label: "Revenue" },
      { key: "status", label: "Status" },
    ],
    formFields: productCategoryFormFields,
    detailFields: [
      { key: "code", label: "Code" },
      { key: "name", label: "Category" },
      { key: "parent_category_id", label: "Parent Category" },
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
    description: "Monitor stok, reorder point, dan item yang butuh restock.",
    icon: Warehouse,
    columns: [
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "stock", label: "Stock" },
      { key: "reserved", label: "Reserved" },
      { key: "reorder", label: "Reorder Point" },
      { key: "status", label: "Status" },
    ],
    formFields: productStockFormFields,
    detailFields: [
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "stock", label: "Stock" },
      { key: "reserved", label: "Reserved" },
      { key: "reorder", label: "Reorder Point" },
      { key: "status", label: "Status" },
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