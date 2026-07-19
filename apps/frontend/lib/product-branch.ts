export type BranchAwareProduct = {
  id: string;
  branch_id?: string | null;
  track_stock?: boolean;
  product_type?: string | null;
};

export type BranchStockRecord = {
  product_id: string;
  branch_id: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}


export function getAvailableBranchIdsForProduct(
  product: BranchAwareProduct,
  stocks: BranchStockRecord[],
  allBranchIds: string[],
): string[] {
  const explicitBranchId = String(product.branch_id ?? "").trim();
  const companyBranchIds = unique(allBranchIds);
  const stockBranchIds = unique(
    stocks
      .filter((stock) => stock.product_id === product.id)
      .map((stock) => stock.branch_id),
  );

  // Product assignment membatasi catalog ke satu branch. Ketiadaan row stock
  // tidak boleh menghilangkan product dari dropdown; stok 0 ditangani saat proses.
  if (explicitBranchId) {
    return companyBranchIds.length === 0 || companyBranchIds.includes(explicitBranchId)
      ? [explicitBranchId]
      : [];
  }

  // Product company-wide tersedia di seluruh branch aktif. Stock record hanya
  // menentukan quantity, bukan menentukan apakah product terlihat.
  return companyBranchIds.length ? companyBranchIds : stockBranchIds;
}

export function isProductAvailableInBranch(
  product: BranchAwareProduct,
  branchId: string,
  stocks: BranchStockRecord[],
  allBranchIds: string[],
) {
  if (!branchId) return false;
  return getAvailableBranchIdsForProduct(product, stocks, allBranchIds)
    .includes(branchId);
}

export function getCompatibleBranchIds(
  products: BranchAwareProduct[],
  stocks: BranchStockRecord[],
  allBranchIds: string[],
  selectedProductIds: string[],
): string[] {
  const selected = unique(selectedProductIds)
    .map((productId) => products.find((product) => product.id === productId))
    .filter((product): product is BranchAwareProduct => Boolean(product));

  if (!selected.length) {
    return unique(
      products.flatMap((product) =>
        getAvailableBranchIdsForProduct(product, stocks, allBranchIds)
      ),
    );
  }

  let compatible = new Set(
    getAvailableBranchIdsForProduct(selected[0], stocks, allBranchIds),
  );

  for (const product of selected.slice(1)) {
    const branchIds = new Set(
      getAvailableBranchIdsForProduct(product, stocks, allBranchIds),
    );
    compatible = new Set(
      Array.from(compatible).filter((branchId) => branchIds.has(branchId)),
    );
  }

  return allBranchIds.filter((branchId) => compatible.has(branchId));
}
