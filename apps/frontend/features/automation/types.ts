export type AutomationProduct = {
  id: string;
  name: string;
  sku: string;
  selling_price: number | string;
  track_stock: boolean;
  product_type: string;
};

export type AutomationStock = {
  id: string;
  product_id: string;
  branch_id: string;
  quantity_on_hand: number | string;
  reserved_quantity: number | string;
};

export type AutomationBranch = {
  id: string;
  name: string;
  code?: string | null;
};

export type SalesOrderLineInput = {
  product_id: string;
  quantity: string;
  unit_price?: string;
  discount_amount: string;
  tax_amount: string;
  description?: string;
};

export type SalesOrderItem = {
  id: string;
  sales_order_id: string;
  product_id: string;
  description?: string | null;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
};

export type SalesOrder = {
  id: string;
  company_id: string;
  branch_id: string;
  order_no: string;
  customer_name: string;
  order_date: string;
  due_date?: string | null;
  status: "draft" | "approved" | "fulfilled" | "cancelled";
  creation_mode: "manual" | "automatic" | string;
  auto_process: boolean;
  subtotal_amount: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  transaction_id?: string | null;
  invoice_id?: string | null;
  approved_at?: string | null;
  fulfilled_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items: SalesOrderItem[];
};

export type DomainEvent = {
  id: string;
  aggregate_id: string;
  event_type: string;
  event_key: string;
  status: "pending" | "processed" | "failed";
  payload: Record<string, unknown>;
  attempts: number;
  occurred_at: string;
  processed_at?: string | null;
  last_error?: string | null;
};

export type AutomationContext = {
  products: AutomationProduct[];
  stocks: AutomationStock[];
  branches: AutomationBranch[];
};

export type AutomationMonitoringRow = {
  order_id: string;
  order_no: string;
  customer_name: string;
  total_amount: number | string;
  order_status: string;
  transaction_id?: string | null;
  transaction_no?: string | null;
  transaction_status?: string | null;
  invoice_id?: string | null;
  invoice_no?: string | null;
  invoice_status?: string | null;
  paid_amount: number | string;
  outstanding_amount: number | string;
  payment_status: "unpaid" | "partial" | "paid";
  created_at: string;
  updated_at: string;
};
