import { describe, expect, it } from "vitest";

import {
  getAvailableBranchIdsForProduct,
  getCompatibleBranchIds,
  isProductAvailableInBranch,
} from "./product-branch";

const branches = ["branch-a", "branch-b", "branch-c"];
const stocks = [
  { product_id: "product-a", branch_id: "branch-a" },
  { product_id: "product-b", branch_id: "branch-a" },
  { product_id: "product-b", branch_id: "branch-b" },
];

const products = [
  {
    id: "product-a",
    branch_id: "branch-a",
    track_stock: true,
    product_type: "physical",
  },
  {
    id: "product-b",
    branch_id: null,
    track_stock: true,
    product_type: "physical",
  },
  {
    id: "service-c",
    branch_id: null,
    track_stock: false,
    product_type: "service",
  },
];

describe("product branch availability", () => {
  it("only exposes the assigned branch for a branch-owned product", () => {
    expect(getAvailableBranchIdsForProduct(products[0], stocks, branches))
      .toEqual(["branch-a"]);
    expect(isProductAvailableInBranch(products[0], "branch-b", stocks, branches))
      .toBe(false);
  });

  it("uses configured stock branches for a company-wide physical product", () => {
    expect(getAvailableBranchIdsForProduct(products[1], stocks, branches))
      .toEqual(["branch-a", "branch-b"]);
  });

  it("allows a non-stock service in every company branch", () => {
    expect(getAvailableBranchIdsForProduct(products[2], stocks, branches))
      .toEqual(branches);
  });

  it("returns the branch intersection for multiple selected products", () => {
    expect(getCompatibleBranchIds(
      products,
      stocks,
      branches,
      ["product-a", "product-b"],
    )).toEqual(["branch-a"]);
  });
});
