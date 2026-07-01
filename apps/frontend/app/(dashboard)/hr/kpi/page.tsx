// app/(dashboard)/hr/kpi/page.tsx
import { HRModuleClient } from "@/features/hr/client";

export default function HRKPIPage() {
  return <HRModuleClient moduleKey="kpi" />;
}