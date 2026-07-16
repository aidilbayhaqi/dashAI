import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readFrontend(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("ERP integrity frontend contracts", () => {
  it("hides generic Finance commands for source-owned automation records", () => {
    const source = readFrontend("features/finance/client.tsx");

    expect(source).toContain("automationOwnedSource");
    expect(source).toContain('sourceModule === "sales_order"');
    expect(source).toContain('sourceModule === "crm_deal"');
    expect(source).toContain('sourceModule === "hr_payroll"');
  });

  it("exposes a dedicated payroll payment workflow", () => {
    const service = readFrontend("features/hr/payroll-service.ts");
    const client = readFrontend("features/hr/client.tsx");

    expect(service).toContain("payPayrollRun");
    expect(service).toContain("/pay");
    expect(client).toContain("Pay Payroll");
  });

  it("requires both linked transaction and invoice before CRM settlement", () => {
    const source = readFrontend("features/crm/client.tsx");

    expect(source).toContain("finance_transaction_id");
    expect(source).toContain("invoice_id");
    expect(source).toContain("Confirm Payment");
  });
  it("continues bulk imports and exports failed rows for correction", () => {
    const helper = readFrontend("lib/import-batch.ts");
    const modulePage = readFrontend("components/modules/module-page.tsx");

    expect(helper).toContain("runSequentialImport");
    expect(helper).toContain("failures.push");
    expect(modulePage).toContain("Download Failed Rows");
    expect(modulePage).toContain("handleExportImportFailures");
  });

});
