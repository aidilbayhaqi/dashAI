import { useQuery } from "@tanstack/react-query";
import type { AdminModuleKey } from "./types";
import { getAdminModuleData } from "./api";

export function useAdminModule(moduleKey: AdminModuleKey) {
  return useQuery({
    queryKey: ["admin", moduleKey],
    queryFn: () => getAdminModuleData(moduleKey),
  });
}