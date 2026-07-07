import { normalizeModuleKey } from "@/lib/module-registry";

export type ProductModuleKey =
  | "overview"
  | "categories"
  | "stock"
  | "suppliers";

export function normalizeProductModuleKey(value: string): ProductModuleKey {
  return normalizeModuleKey("product", value) as ProductModuleKey;
}