// app/(dashboard)/hr/payroll/page.tsx
import { HRModuleClient } from "@/features/hr/client";

export default function HRPayrollPage() {
  return <HRModuleClient moduleKey="payroll" />;
}