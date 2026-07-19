import type {
  AutomationProduct,
  AutomationStock,
} from "./types";

export type AutomationStockLine = {
  product_id: string;
  quantity: string | number;
};

export function buildAutomationStockIndex(stocks: AutomationStock[]) {
  const index = new Map<string, number>();

  for (const stock of stocks) {
    const key = `${String(stock.branch_id)}:${String(stock.product_id)}`;
    const available = Math.max(
      Number(stock.quantity_on_hand || 0) - Number(stock.reserved_quantity || 0),
      0,
    );

    // Aggregate defensively. The database normally has one stock row per
    // product+branch, but summing prevents an older duplicate/partial response
    // from overwriting a positive quantity with zero.
    index.set(key, (index.get(key) ?? 0) + available);
  }

  return index;
}

export function getAvailableAutomationStock(
  stockIndex: Map<string, number>,
  branchId: string,
  productId: string,
) {
  if (!branchId || !productId) return 0;
  return stockIndex.get(`${branchId}:${productId}`) ?? 0;
}

export function getBranchesWithEnoughAutomationStock({
  branchIds,
  products,
  lines,
  stockIndex,
}: {
  branchIds: string[];
  products: AutomationProduct[];
  lines: AutomationStockLine[];
  stockIndex: Map<string, number>;
}) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const selectedLines = lines.filter((line) => line.product_id);

  if (!selectedLines.length) return branchIds;

  return branchIds.filter((branchId) => selectedLines.every((line) => {
    const product = productMap.get(line.product_id);
    if (!product) return false;

    if (!product.track_stock || product.product_type !== "physical") {
      return true;
    }

    const required = Math.max(Number(line.quantity || 0), 0);
    return getAvailableAutomationStock(
      stockIndex,
      branchId,
      line.product_id,
    ) >= required;
  }));
}
