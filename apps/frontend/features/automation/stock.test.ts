import { describe, expect, it } from "vitest";

import {
  buildAutomationStockIndex,
  getAvailableAutomationStock,
  getBranchesWithEnoughAutomationStock,
} from "./stock";

const products = [
  {
    id: "product-1",
    name: "Product A",
    sku: "A",
    selling_price: "100",
    track_stock: true,
    product_type: "physical",
  },
];

describe("automation stock context", () => {
  it("aggregates stock rows for the same product and branch", () => {
    const index = buildAutomationStockIndex([
      { id: "1", product_id: "product-1", branch_id: "branch-1", quantity_on_hand: "10", reserved_quantity: "2" },
      { id: "2", product_id: "product-1", branch_id: "branch-1", quantity_on_hand: "5", reserved_quantity: "1" },
    ]);

    expect(getAvailableAutomationStock(index, "branch-1", "product-1")).toBe(12);
  });

  it("selects the branch that actually has enough stock", () => {
    const index = buildAutomationStockIndex([
      { id: "1", product_id: "product-1", branch_id: "branch-1", quantity_on_hand: "0", reserved_quantity: "0" },
      { id: "2", product_id: "product-1", branch_id: "branch-2", quantity_on_hand: "20.0000", reserved_quantity: "0" },
    ]);

    expect(getBranchesWithEnoughAutomationStock({
      branchIds: ["branch-1", "branch-2"],
      products,
      lines: [{ product_id: "product-1", quantity: "1" }],
      stockIndex: index,
    })).toEqual(["branch-2"]);
  });
});
