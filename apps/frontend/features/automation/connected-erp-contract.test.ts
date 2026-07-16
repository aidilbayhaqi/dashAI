import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readFrontend(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Connected ERP automation frontend contracts", () => {
  it("persists Excel imports through the existing module create workflow", () => {
    const source = readFrontend("components/modules/module-page.tsx");

    expect(source).toContain("onImportRecords?:");
    expect(source).toContain("await onImportRecords(validRows)");
    expect(source).toContain("await onCreateRecord(row)");
    expect(source).toContain("workflow module");
  });

  it("identifies AI settings as a read-only AI Agent", () => {
    const apiSource = readFrontend("features/settings/api.ts");
    const uiSource = readFrontend("features/settings/client.tsx");

    expect(apiSource).toContain('mode: "ai_agent"');
    expect(apiSource).toContain("agent_read_only");
    expect(apiSource).toContain("human_approval_required");
    expect(uiSource).toContain("AI Agent");
    expect(uiSource).toContain("Read-only Agent");
  });
});
