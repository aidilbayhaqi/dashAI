// app/(dashboard)/crm/campaigns/page.tsx
import { CRMModuleClient } from "@/features/crm/client";

export default function CRMCampaignsPage() {
  return <CRMModuleClient moduleKey="campaigns" />;
}