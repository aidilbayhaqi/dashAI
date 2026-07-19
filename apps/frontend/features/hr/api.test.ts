import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("@/lib/module-crud", () => ({
  getScopedQueryParams: (_feature: string, params: Record<string, unknown>) => params,
}));

import { getHRModuleData } from "./api";

describe("HR production loading", () => {
  beforeEach(() => apiMock.get.mockReset());

  it("loads employees once and treats an empty response as valid", async () => {
    apiMock.get.mockResolvedValue({ data: { data: [] } });

    const result = await getHRModuleData({
      moduleKey: "employees",
      companyId: "company-1",
    });

    expect(result.rows).toEqual([]);
    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith("/api/v1/hr/employees", {
      params: {
        company_id: "company-1",
        limit: 100,
        sort_by: "updated_at",
        sort_order: "desc",
      },
    });
  });

  it("only fetches related employees for modules that need employee labels", async () => {
    apiMock.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } });

    await getHRModuleData({
      moduleKey: "attendance",
      companyId: "company-1",
    });

    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });
});
