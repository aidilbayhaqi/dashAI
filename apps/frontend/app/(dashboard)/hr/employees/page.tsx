// app/(dashboard)/hr/employees/page.tsx
import { HRModuleClient } from "@/features/hr/client";

export default function HREmployeesPage() {
  return <HRModuleClient moduleKey="employees" />;
}