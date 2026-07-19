import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: apiMock,
}));

import {
  confirmSalesOrderPayment,
  createSalesOrder,
  getAutomationContext,
  getAutomationEvents,
  getAutomationMonitoring,
  getSalesOrders,
  processSalesOrder,
} from "./api";

describe("automation API client", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
  });

  it("loads product, stock, and branch context from the correct endpoints", async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "product-1",
              name: "Laptop Test",
              sku: "SKU-001",
              selling_price: "15000000",
              track_stock: true,
              product_type: "physical",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "stock-1",
              product_id: "product-1",
              branch_id: "branch-1",
              quantity_on_hand: "10",
              reserved_quantity: "2",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "branch-1",
            name: "Gudang Utama",
            code: "GDU",
          },
        ],
      });

    const result = await getAutomationContext("company-1");

    expect(apiMock.get).toHaveBeenNthCalledWith(
      1,
      "/api/v1/products/items",
      {
        params: {
          company_id: "company-1",
          is_active: true,
          sort_by: "name",
          sort_order: "asc",
          page: 1,
          limit: 100,
        },
      }
    );
    expect(apiMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/products/stocks",
      {
        params: {
          company_id: "company-1",
          sort_by: "updated_at",
          sort_order: "desc",
          page: 1,
          limit: 100,
        },
      }
    );
    expect(apiMock.get).toHaveBeenNthCalledWith(
      3,
      "/api/v1/companies/company-1/branches"
    );

    expect(result.products).toHaveLength(1);
    expect(result.stocks).toHaveLength(1);
    expect(result.branches).toHaveLength(1);
  });

  it("loads sales orders and domain events with company scope", async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "order-1" }],
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: "event-1" }],
      });

    const orders = await getSalesOrders("company-1");
    const events = await getAutomationEvents("company-1");

    expect(apiMock.get).toHaveBeenNthCalledWith(
      1,
      "/api/v1/automation/sales-orders",
      {
        params: {
          company_id: "company-1",
          page: 1,
          limit: 100,
        },
      }
    );
    expect(apiMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/automation/events",
      {
        params: {
          company_id: "company-1",
          limit: 100,
        },
      }
    );
    expect(orders).toEqual([{ id: "order-1" }]);
    expect(events).toEqual([{ id: "event-1" }]);
  });

  it("creates a sales order with manual creation mode and idempotency key", async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        id: "order-1",
        status: "fulfilled",
      },
    });

    const payload = {
      company_id: "company-1",
      branch_id: "branch-1",
      customer_name: "PT Customer",
      auto_process: true,
      items: [
        {
          product_id: "product-1",
          quantity: "2",
          unit_price: "15000000",
          discount_amount: "0",
          tax_amount: "0",
        },
      ],
    };

    const result = await createSalesOrder(payload);

    expect(apiMock.post).toHaveBeenCalledWith(
      "/api/v1/automation/sales-orders",
      {
        ...payload,
        creation_mode: "manual",
      },
      {
        headers: {
          "Idempotency-Key":
            "sales-order-create-00000000000040008000000000000000",
        },
      }
    );
    expect(result).toEqual({
      id: "order-1",
      status: "fulfilled",
    });
  });

  it("processes a draft order with company scope and a new idempotency key", async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        id: "order-1",
        status: "fulfilled",
      },
    });

    await processSalesOrder({
      companyId: "company-1",
      orderId: "order-1",
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/api/v1/automation/sales-orders/order-1/process",
      {},
      {
        params: {
          company_id: "company-1",
        },
        headers: {
          "Idempotency-Key":
            "sales-order-process-00000000000040008000000000000000",
        },
      }
    );
  });

  it("loads automation monitoring with latest business status", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: [
        {
          order_id: "order-1",
          payment_status: "unpaid",
        },
      ],
    });

    const rows = await getAutomationMonitoring("company-1");

    expect(apiMock.get).toHaveBeenCalledWith(
      "/api/v1/automation/monitoring",
      {
        params: {
          company_id: "company-1",
          limit: 200,
        },
      }
    );
    expect(rows).toEqual([
      {
        order_id: "order-1",
        payment_status: "unpaid",
      },
    ]);
  });

  it("confirms payment with company scope and idempotency key", async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        order_id: "order-1",
        payment_status: "paid",
      },
    });

    const result = await confirmSalesOrderPayment({
      companyId: "company-1",
      orderId: "order-1",
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/api/v1/automation/sales-orders/order-1/confirm-payment",
      {},
      {
        params: {
          company_id: "company-1",
        },
        headers: {
          "Idempotency-Key":
            "sales-order-payment-00000000000040008000000000000000",
        },
      }
    );
    expect(result.payment_status).toBe("paid");
  });

});
