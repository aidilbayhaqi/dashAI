import { useQuery } from "@tanstack/react-query";
import type { HRModuleKey } from "./types";
import { getHRModuleData } from "./api";

export function useHRModule(moduleKey: HRModuleKey) {
  return useQuery({
    queryKey: ["hr", moduleKey],
    queryFn: () => getHRModuleData(moduleKey),
  });
}