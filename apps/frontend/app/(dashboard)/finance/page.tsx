// app/(dashboard)/finance/page.tsx
import { FinanceModuleClient } from "@/features/finance/client";

export default function FinancePage() {
  return <FinanceModuleClient moduleKey="overview" />;
}