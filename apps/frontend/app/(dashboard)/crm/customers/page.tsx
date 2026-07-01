// app/(dashboard)/crm/page.tsx
import { CRMModuleClient } from "@/features/crm/client";

export default function CRMCustomersPage() {
  return <CRMModuleClient moduleKey="customers" />;
}