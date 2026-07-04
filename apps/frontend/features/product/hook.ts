import { useQuery } from "@tanstack/react-query";
import { getProductModuleData } from "./api";
import type { ProductModuleKey } from "./types";

export function useProductModule(moduleKey: ProductModuleKey) {
  return useQuery({
    queryKey: ["product", moduleKey],
    queryFn: () => getProductModuleData(moduleKey),
  });
}