import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ModuleDetailDialog } from "@/components/modules/module-detail-dialog";

import { AutomationMonitoringTable } from "./monitoring-table";
import type { AutomationMonitoringRow } from "./types";

const hiddenCompanyId = "13ae7b99-5eca-544d-af72-957d9389624e";
const hiddenSourceId = "608c5207-7d0f-5ff4-9d9e-0737aa319a87";

function monitoringRow(
  overrides: Partial<AutomationMonitoringRow>
): AutomationMonitoringRow {
  return {
    order_id: "order-1",
    order_no: "SO-OLD",
    customer_name: "Customer Lama",
    total_amount: "1000000",
    order_status: "fulfilled",
    transaction_id: "transaction-1",
    transaction_no: "TRX-OLD",
    transaction_status: "posted",
    invoice_id: "invoice-1",
    invoice_no: "INV-OLD",
    invoice_status: "sent",
    paid_amount: "0",
    outstanding_amount: "1000000",
    payment_status: "unpaid",
    created_at: "2026-07-10T08:00:00Z",
    updated_at: "2026-07-10T08:00:00Z",
    ...overrides,
  };
}

describe("business monitoring UI refinement", () => {
  it("hides UUID and technical identifiers from the modern detail modal", () => {
    render(
      <ModuleDetailDialog
        open
        title="Invoice"
        row={{
          id: hiddenSourceId,
          company_id: hiddenCompanyId,
          source_id: hiddenSourceId,
          invoice_no: "INV-2026-001",
          client_name: "PT Modern Customer",
          total_amount: "2500000",
          status: "paid",
          created_at: "2026-07-11T08:00:00Z",
          updated_at: "2026-07-11T09:00:00Z",
        }}
        columns={[
          { key: "invoice_no", label: "Invoice No" },
          { key: "client_name", label: "Customer" },
          { key: "company_id", label: "Company UUID" },
          { key: "source_id", label: "Source UUID" },
          { key: "total_amount", label: "Total", format: "currency" },
          { key: "status", label: "Status" },
        ]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText("INV-2026-001").length).toBeGreaterThan(0);
    expect(screen.getByText("Informasi utama")).toBeInTheDocument();
    expect(screen.getByText("Riwayat record")).toBeInTheDocument();
    expect(screen.queryByText(hiddenCompanyId)).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenSourceId)).not.toBeInTheDocument();
    expect(screen.queryByText("Company UUID")).not.toBeInTheDocument();
    expect(screen.queryByText("Source UUID")).not.toBeInTheDocument();
  });

  it("orders newest updates first and filters monitoring by payment status", async () => {
    const user = userEvent.setup();
    const rows = [
      monitoringRow({}),
      monitoringRow({
        order_id: "order-2",
        order_no: "SO-NEW",
        customer_name: "Customer Baru",
        transaction_id: "transaction-2",
        transaction_no: "TRX-NEW",
        invoice_id: "invoice-2",
        invoice_no: "INV-NEW",
        invoice_status: "paid",
        paid_amount: "2000000",
        outstanding_amount: "0",
        total_amount: "2000000",
        payment_status: "paid",
        created_at: "2026-07-11T08:00:00Z",
        updated_at: "2026-07-11T10:00:00Z",
      }),
    ];

    render(
      <AutomationMonitoringTable
        rows={rows}
        onConfirmPayment={vi.fn()}
      />
    );

    const initialRows = screen.getAllByRole("row");
    expect(within(initialRows[1]).getByText("SO-NEW")).toBeInTheDocument();
    expect(within(initialRows[2]).getByText("SO-OLD")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Filter status pembayaran"),
      "unpaid"
    );

    expect(screen.getByText("SO-OLD")).toBeInTheDocument();
    expect(screen.queryByText("SO-NEW")).not.toBeInTheDocument();
  });
});
