// app/(dashboard)/hr/attendance/page.tsx
import { HRModuleClient } from "@/features/hr/client";

export default function HRAttendancePage() {
  return <HRModuleClient moduleKey="attendance" />;
}