import type { ModuleData } from "@/types/modules";
import type { ProductModuleKey } from "./types";
import { productDummyData } from "./dummy";
// import { api } from "@/lib/api";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getProductModuleData(
  moduleKey: ProductModuleKey
): Promise<ModuleData> {
  await wait(400);

  // NANTI SAAT FETCH API:
  // const response = await api.get(`/api/v1/products/${moduleKey}`);
  // return response.data;

  return productDummyData[moduleKey];
}