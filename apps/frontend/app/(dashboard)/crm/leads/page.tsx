// app/(dashboard)/crm/leads/page.tsx
import { CRMModuleClient } from "@/features/crm/client";

export default function CRMLeadsPage() {
  return <CRMModuleClient moduleKey="leads" />;
}