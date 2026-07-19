import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const automationApiMock = vi.hoisted(() => ({
  getAutomationContext: vi.fn(),
  getSalesOrders: vi.fn(),
  getAutomationEvents: vi.fn(),
  getAutomationMonitoring: vi.fn(),
  getAutomationRules: vi.fn(),
  createSalesOrder: vi.fn(),
  processSalesOrder: vi.fn(),
  confirmSalesOrderPayment: vi.fn(),
}));

const authScopeState = vi.hoisted(() => ({
  companyId: "company-1" as string | null,
  superAdmin: false,
  selectedCompanyId: "company-1",
  defaultBranchId: "branch-1" as string | null,
}));

vi.mock("./api", () => automationApiMock);

vi.mock("@/lib/auth-scope", () => ({
  getCurrentCompanyId: () => authScopeState.companyId,
  getCurrentDefaultBranchId: () => authScopeState.defaultBranchId,
  isCurrentUserSuperAdmin: () => authScopeState.superAdmin,
}));

vi.mock("@/lib/company-scope", () => ({
  ALL_COMPANIES_VALUE: "__all_companies__",
  useCompanyScope: () => ({
    selectedCompanyId: authScopeState.selectedCompanyId,
  }),
}));

vi.mock("@/components/modules/company-scope-filter", () => ({
  CompanyScopeFilter: () => (
    <div data-testid="company-scope-filter">Company filter</div>
  ),
}));

import { SalesAutomationClient } from "./client";

const contextFixture = {
  products: [
    {
      id: "product-1",
      name: "Laptop Test",
      sku: "SKU-001",
      selling_price: "15000000",
      track_stock: true,
      product_type: "physical",
    },
  ],
  stocks: [
    {
      id: "stock-1",
      product_id: "product-1",
      branch_id: "branch-1",
      quantity_on_hand: "10",
      reserved_quantity: "2",
    },
  ],
  branches: [
    {
      id: "branch-1",
      name: "Gudang Utama",
      code: "GDU",
    },
  ],
};

const fulfilledOrderFixture = {
  id: "order-1",
  company_id: "company-1",
  branch_id: "branch-1",
  order_no: "SO-20260711-0001",
  customer_name: "PT Existing Customer",
  order_date: "2026-07-11",
  due_date: null,
  status: "fulfilled" as const,
  creation_mode: "manual",
  auto_process: true,
  subtotal_amount: "15000000",
  discount_amount: "0",
  tax_amount: "0",
  total_amount: "15000000",
  transaction_id: "transaction-1",
  invoice_id: "invoice-1",
  approved_at: "2026-07-11T08:00:00Z",
  fulfilled_at: "2026-07-11T08:01:00Z",
  notes: null,
  created_at: "2026-07-11T08:00:00Z",
  updated_at: "2026-07-11T08:01:00Z",
  items: [
    {
      id: "item-1",
      sales_order_id: "order-1",
      product_id: "product-1",
      quantity: "1",
      unit_price: "15000000",
      discount_amount: "0",
      tax_amount: "0",
      total_amount: "15000000",
    },
  ],
};

const eventFixture = {
  id: "event-1",
  aggregate_id: "order-1",
  event_type: "sales_order.fulfilled",
  event_key: "sales_order.fulfilled:order-1",
  status: "processed" as const,
  payload: {},
  attempts: 1,
  occurred_at: "2026-07-11T08:01:00Z",
  processed_at: "2026-07-11T08:01:01Z",
  last_error: null,
};

const monitoringFixture = {
  order_id: "order-1",
  order_no: "SO-20260711-0001",
  customer_name: "PT Existing Customer",
  total_amount: "15000000",
  order_status: "fulfilled",
  transaction_id: "transaction-1",
  transaction_no: "TRX-SO-20260711-0001",
  transaction_status: "posted",
  invoice_id: "invoice-1",
  invoice_no: "INV-SO-20260711-0001",
  invoice_status: "sent",
  paid_amount: "0",
  outstanding_amount: "15000000",
  payment_status: "unpaid" as const,
  created_at: "2026-07-11T08:00:00Z",
  updated_at: "2026-07-11T08:01:00Z",
};

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("SalesAutomationClient", () => {
  beforeEach(() => {
    authScopeState.companyId = "company-1";
    authScopeState.superAdmin = false;
    authScopeState.selectedCompanyId = "company-1";
    authScopeState.defaultBranchId = "branch-1";

    automationApiMock.getAutomationContext.mockResolvedValue(
      contextFixture
    );
    automationApiMock.getSalesOrders.mockResolvedValue([
      fulfilledOrderFixture,
    ]);
    automationApiMock.getAutomationEvents.mockResolvedValue([
      eventFixture,
    ]);
    automationApiMock.getAutomationMonitoring.mockResolvedValue([
      monitoringFixture,
    ]);
    automationApiMock.getAutomationRules.mockResolvedValue([]);
    automationApiMock.createSalesOrder.mockResolvedValue(
      fulfilledOrderFixture
    );
    automationApiMock.processSalesOrder.mockResolvedValue(
      fulfilledOrderFixture
    );
    automationApiMock.confirmSalesOrderPayment.mockResolvedValue({
      ...monitoringFixture,
      invoice_status: "paid",
      paid_amount: "15000000",
      outstanding_amount: "0",
      payment_status: "paid",
    });
  });

  it("shows an empty company state when no company scope is available", async () => {
    authScopeState.companyId = null;
    authScopeState.selectedCompanyId = "__all_companies__";
    authScopeState.superAdmin = true;

    renderWithQueryClient(<SalesAutomationClient />);

    expect(
      screen.getByText("Pilih company untuk memulai")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("company-scope-filter")
    ).toBeInTheDocument();
    expect(
      automationApiMock.getAutomationContext
    ).not.toHaveBeenCalled();
  });

  it("renders the product-to-cash flow, metrics, order, and event data", async () => {
    renderWithQueryClient(<SalesAutomationClient />);

    expect(
      await screen.findByText("Connected ERP Automation")
    ).toBeInTheDocument();
    expect(
      screen.getByText("1. Product & Stock")
    ).toBeInTheDocument();
    expect(
      screen.getByText("2. Sales Order")
    ).toBeInTheDocument();
    expect(
      screen.getByText("3. Transaction")
    ).toBeInTheDocument();
    expect(
      screen.getByText("4. Invoice")
    ).toBeInTheDocument();

    expect(
      (await screen.findAllByText("SO-20260711-0001")).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("sales_order.fulfilled")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Transaction created")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Invoice created")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Product-to-cash history")
    ).toBeInTheDocument();
    expect(
      screen.getByText("TRX-SO-20260711-0001")
    ).toBeInTheDocument();
  });

  it("blocks submission when customer and branch are missing", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<SalesAutomationClient />);

    await screen.findByText("Connected ERP Automation");

    await user.click(
      screen.getByRole("button", {
        name: "Create & automate flow",
      })
    );

    expect(
      screen.getByText("Customer dan branch wajib diisi.")
    ).toBeInTheDocument();
    expect(
      automationApiMock.createSalesOrder
    ).not.toHaveBeenCalled();
  });

  it("submits a valid automatic sales order payload", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<SalesAutomationClient />);

    await screen.findByText("Connected ERP Automation");

    await user.type(
      screen.getByLabelText("Customer name"),
      "PT Customer Baru"
    );
    await user.selectOptions(
      screen.getByLabelText("Branch / warehouse"),
      "branch-1"
    );

    const productSelect = screen.getByDisplayValue("Select product");
    await user.selectOptions(productSelect, "product-1");

    const quantityInput = screen.getByPlaceholderText("Qty");
    await user.clear(quantityInput);
    await user.type(quantityInput, "2");

    await user.click(
      screen.getByRole("button", {
        name: "Create & automate flow",
      })
    );

    await waitFor(() => {
      expect(
        automationApiMock.createSalesOrder
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      automationApiMock.createSalesOrder.mock.calls[0]?.[0]
    ).toEqual({
      company_id: "company-1",
      branch_id: "branch-1",
      customer_name: "PT Customer Baru",
      due_date: undefined,
      auto_process: true,
      notes: undefined,
      items: [
        {
          product_id: "product-1",
          quantity: "2",
          unit_price: "15000000",
          discount_amount: "0",
          tax_amount: "0",
        },
      ],
    });


    expect(
      await screen.findByText("Sales automation berhasil")
    ).toBeInTheDocument();
  });

  it("supports saving a draft and processing it later", async () => {
    const user = userEvent.setup();

    automationApiMock.getSalesOrders.mockResolvedValue([
      {
        ...fulfilledOrderFixture,
        id: "order-draft-1",
        order_no: "SO-DRAFT-0001",
        status: "draft",
        auto_process: false,
        transaction_id: null,
        invoice_id: null,
      },
    ]);

    renderWithQueryClient(<SalesAutomationClient />);

    expect(
      await screen.findByText("SO-DRAFT-0001")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Process draft automatically",
      })
    );

    await waitFor(() => {
      expect(
        automationApiMock.processSalesOrder
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      automationApiMock.processSalesOrder.mock.calls[0]?.[0]
    ).toEqual({
      companyId: "company-1",
      orderId: "order-draft-1",
    });

    const autoProcessCheckbox = screen.getByRole("checkbox", {
      name: /Auto process/i,
    });

    await user.click(autoProcessCheckbox);

    expect(
      screen.getByRole("button", {
        name: "Save as draft",
      })
    ).toBeInTheDocument();
  });

  it("confirms payment from the monitoring table", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<SalesAutomationClient />);

    await screen.findByText("Product-to-cash history");
    const confirmPaymentButton = await screen.findByRole("button", {
      name: "Konfirmasi Lunas",
    });
    await user.click(confirmPaymentButton);

    await waitFor(() => {
      expect(
        automationApiMock.confirmSalesOrderPayment
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      automationApiMock.confirmSalesOrderPayment.mock.calls[0]?.[0]
    ).toEqual({
      companyId: "company-1",
      orderId: "order-1",
    });

    expect(
      await screen.findByText("Pembayaran berhasil dikonfirmasi")
    ).toBeInTheDocument();
  });

  it("blocks automatic POST when branch stock is insufficient", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<SalesAutomationClient />);

    await user.type(
      await screen.findByLabelText("Customer name"),
      "PT Stok Kurang",
    );
    await user.selectOptions(
      screen.getByLabelText("Branch / warehouse"),
      "branch-1",
    );
    await user.selectOptions(
      screen.getByLabelText("Product item 1"),
      "product-1",
    );

    const quantityInput = screen.getByLabelText("Quantity item 1");
    await user.clear(quantityInput);
    await user.type(quantityInput, "9");

    await user.click(
      screen.getByRole("button", { name: "Create & automate flow" }),
    );

    const stockAlert = await screen.findByRole("alert");
    expect(stockAlert).toHaveTextContent("Stok Laptop Test");
    expect(stockAlert).toHaveTextContent("Gudang Utama");
    expect(stockAlert).toHaveTextContent("hanya 8");
    expect(stockAlert).toHaveTextContent("kebutuhan 9");
    expect(automationApiMock.createSalesOrder).not.toHaveBeenCalled();
  });

});
