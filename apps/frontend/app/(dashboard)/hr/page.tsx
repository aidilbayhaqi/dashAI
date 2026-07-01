// app/(dashboard)/hr/employees/page.tsx
import { HRModuleClient } from "@/features/hr/client";

export default function HRPage() {
  return <HRModuleClient moduleKey="overview" />;
}