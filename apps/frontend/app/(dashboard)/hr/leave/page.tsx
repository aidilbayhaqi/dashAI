// app/(dashboard)/hr/leave/page.tsx
import { HRModuleClient } from "@/features/hr/client";

export default function HRLeavePage() {
  return <HRModuleClient moduleKey="leave" />;
}