// app/(dashboard)/finance/taxes/page.tsx
import { FinanceModuleClient } from "@/features/finance/client";

export default function FinanceTaxesPage() {
  return <FinanceModuleClient moduleKey="taxes" />;
}