// app/(dashboard)/crm/pipeline/page.tsx
import { CRMModuleClient } from "@/features/crm/client";

export default function CRMPipelinePage() {
  return <CRMModuleClient moduleKey="pipeline" />;
}