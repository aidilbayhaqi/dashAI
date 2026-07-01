import { useQuery } from "@tanstack/react-query";
import type { ProductModuleKey } from "./types";
import { getProductModuleData } from "./api";

export function useProductModule(moduleKey: ProductModuleKey) {
  return useQuery({
    queryKey: ["products", moduleKey],
    queryFn: () => getProductModuleData(moduleKey),
  });
}