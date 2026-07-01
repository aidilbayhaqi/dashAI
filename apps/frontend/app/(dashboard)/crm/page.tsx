// app/(dashboard)/crm/page.tsx
import { CRMModuleClient } from "@/features/crm/client";

export default function CRMPage() {
  return <CRMModuleClient moduleKey="overview" />;
}