import {
  Boxes,
  Package,
  PackageCheck,
  Tags,
  Truck,
  Warehouse,
} from "lucide-react";

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
    key: "sku",
    label: "SKU",
    required: true,
    placeholder: "PRD-001",
  },
  {
    key: "barcode",
    label: "Barcode",
    placeholder: "899xxxxxxxxxx",
  },
  {
    key: "name",
    label: "Product Name",
    required: true,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
  },
  {
    key: "image_url",
    label: "Photo",
    type: "file",
  },
  {
    key: "product_type",
    label: "Product Type",
    type: "select",
    options: [
      { label: "Physical", value: "physical" },
      { label: "Service", value: "service" },
      { label: "Digital", value: "digital" },
    ],
  },
  {
    key: "unit",
    label: "Unit",
    placeholder: "pcs / box / kg",
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
    required: true,
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

const categoryFormFields: ModuleField[] = [
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
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
  },
];

const stockFormFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
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
    key: "branch_id",
    label: "Branch",
    type: "select",
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

const supplierFormFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  {
    key: "name",
    label: "Supplier Name",
    required: true,
  },
  {
    key: "category",
    label: "Category",
    placeholder: "Raw material / Distributor / Vendor",
  },
  {
    key: "contact_person",
    label: "Contact Person",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
  },
  {
    key: "phone",
    label: "Phone",
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
      { label: "Blocked", value: "blocked" },
    ],
  },
];

export const productModuleConfig: Record<ProductModuleKey, ModuleConfig> = {
  overview: {
    badge: "Product / Items",
    title: "Product Items",
    description:
      "Kelola SKU, kategori, harga, foto produk, dan status product item.",
    icon: Package,
    tableTitle: "Product Records",
    tableDescription:
      "Data product item dibaca dari API /api/v1/products/items.",
    columns: [
      { key: "photo", label: "Photo" },
      { key: "sku", label: "SKU" },
      { key: "name", label: "Product Name" },
      { key: "category_name", label: "Category" },
      { key: "branch_name", label: "Branch" },
      { key: "unit", label: "Unit" },
      { key: "selling_price_display", label: "Selling Price", format: "currency" },
      { key: "status_label", label: "Status" },
    ],
    formFields: productItemFormFields,
  },

  categories: {
    badge: "Product / Categories",
    title: "Product Categories",
    description:
      "Kelola kategori produk dan parent category untuk struktur katalog.",
    icon: Tags,
    tableTitle: "Category Records",
    tableDescription:
      "Data category dibaca dari API /api/v1/products/categories.",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Category Name" },
      { key: "parent_category_name", label: "Parent Category" },
      { key: "description", label: "Description" },
      { key: "status_label", label: "Active" },
    ],
    formFields: categoryFormFields,
  },

  stock: {
    badge: "Product / Stock",
    title: "Stock Control",
    description:
      "Kelola stok produk per branch, reserved quantity, dan reorder point.",
    icon: Warehouse,
    tableTitle: "Stock Records",
    tableDescription:
      "Data stock dibaca dari API /api/v1/products/stocks dan relation product/branch di-resolve.",
    columns: [
      { key: "product", label: "Product" },
      { key: "branch", label: "Branch" },
      { key: "quantity_on_hand", label: "On Hand", format: "number", maximumFractionDigits: 4 },
      { key: "reserved_quantity", label: "Reserved", format: "number", maximumFractionDigits: 4 },
      { key: "reorder_point", label: "Reorder Point", format: "number", maximumFractionDigits: 4 },
    ],
    formFields: stockFormFields,
  },

  suppliers: {
    badge: "Product / Suppliers",
    title: "Suppliers",
    description:
      "Kelola supplier/vendor produk, kontak, alamat, dan estimasi lead time.",
    icon: Truck,
    tableTitle: "Supplier Records",
    tableDescription:
      "Data supplier dibaca dari API /api/v1/products/suppliers.",
    columns: [
      { key: "supplier", label: "Supplier" },
      { key: "category", label: "Category" },
      { key: "contact_person", label: "Contact Person" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "lead_time", label: "Lead Time", format: "number", unit: "hari" },
      { key: "status_label", label: "Status" },
    ],
    formFields: supplierFormFields,
  },
};